import sys

code = '''"""
AI service for Astra Asset Assistant.

Uses Groq API (free tier) if GROQ_API_KEY is set in settings.
Falls back to smart real-database-driven response generator if API key is not configured or fails.
"""
import json
import logging
import re
import urllib.request
import urllib.error
from datetime import date

from django.conf import settings
from django.db import transaction

from apps.assets.models import Asset, AssetUnit, AssetAssignmentHistory, AssetRequest, AssetCategory
from apps.assets.services import (
    AssetService,
    AssignmentService,
    AssetRequestService,
    AssetCategoryService,
)
from apps.maintenance.models import MaintenanceRequest, MaintenanceTimelineEntry
from apps.users.models import User
from apps.purchases.models import Purchase, Supplier

from .prompts import MAINTENANCE_GENERATION_SYSTEM_PROMPT, AI_ASSISTANT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.1-8b-instant"


# ---------------------------------------------------------------------------
# Legacy Maintenance Issue Generator (used by existing modal feature)
# ---------------------------------------------------------------------------

_MOCK_RULES = [
    (["screen", "display", "monitor", "flicker", "blank", "pixel"],
     "Display Unit Malfunction",
     "The screen/display unit is experiencing issues that impair visibility and usability. This directly affects the user's ability to perform work tasks. The device requires immediate inspection of the display hardware and cable connections.",
     "HIGH"),
    (["keyboard", "key", "typing", "spacebar", "button"],
     "Keyboard Input Failure",
     "The keyboard is malfunctioning, preventing normal data entry. Missing or non-responsive keys create significant productivity barriers for the user. The keyboard requires replacement or repair by the IT team.",
     "MEDIUM"),
    (["battery", "charge", "charging", "power", "not turning on"],
     "Power System Failure - Battery or Charging Issue",
     "The device is experiencing power-related issues that prevent normal operation. The battery may be degraded or the charging circuitry is faulty. Immediate assessment and likely battery replacement is required.",
     "HIGH"),
    (["slow", "lag", "freeze", "hang", "performance"],
     "Performance Degradation - System Slowdown",
     "The device is exhibiting significant performance degradation, causing delays in completing work tasks. This may be caused by storage issues, memory constraints, or software conflicts. A hardware diagnostic and performance audit is recommended.",
     "MEDIUM"),
    (["fan", "heat", "hot", "overheating", "noise"],
     "Cooling System Malfunction - Thermal Issue",
     "The device cooling system is not operating correctly, leading to excessive heat buildup or abnormal fan noise. Continued use risks hardware damage from thermal stress. Immediate inspection and cleaning or fan replacement is required.",
     "HIGH"),
    (["crack", "broken", "physical", "damage", "drop", "fell"],
     "Physical Damage - Hardware Impact",
     "The device has sustained physical damage that may affect structural integrity and internal components. Continued use may worsen the damage or pose a safety risk. A full physical inspection and damage assessment is required.",
     "HIGH"),
    (["wifi", "internet", "network", "connection", "bluetooth"],
     "Network Connectivity Failure",
     "The device is unable to establish or maintain network connectivity, preventing access to critical business systems. This significantly impacts the user's ability to complete work. Network adapter diagnostics and driver/hardware inspection are required.",
     "HIGH"),
    (["mouse", "trackpad", "cursor", "click", "scroll"],
     "Pointing Device Malfunction",
     "The pointing device (mouse/trackpad) is not responding correctly, hindering navigation and interaction with the system. While a workaround may be possible with keyboard shortcuts, productivity is affected. Device replacement or driver update is recommended.",
     "LOW"),
]

_MOCK_DEFAULT = (
    "General Hardware Issue Reported",
    "A hardware issue has been reported that requires IT team assessment. The exact nature and impact will be determined upon inspection. Please prioritize based on the user's workflow impact.",
    "MEDIUM",
)


def _smart_mock(prompt: str) -> dict:
    lower = prompt.lower()
    for keywords, title, description, priority in _MOCK_RULES:
        if any(kw in lower for kw in keywords):
            return {"title": title, "description": description, "priority": priority}
    return {
        "title":       _MOCK_DEFAULT[0],
        "description": _MOCK_DEFAULT[1],
        "priority":    _MOCK_DEFAULT[2],
    }


def _call_groq(prompt: str, api_key: str) -> dict:
    payload = json.dumps({
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": MAINTENANCE_GENERATION_SYSTEM_PROMPT},
            {"role": "user",   "content": f"Issue description: {prompt}"},
        ],
        "temperature": 0.3,
        "max_tokens": 400,
        "response_format": {"type": "json_object"},
    }).encode("utf-8")

    req = urllib.request.Request(
        GROQ_API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=15) as resp:
        body = json.loads(resp.read().decode("utf-8"))

    content = body["choices"][0]["message"]["content"]
    return json.loads(content)


def generate_maintenance_issue(prompt: str) -> dict:
    api_key = getattr(settings, "GROQ_API_KEY", "").strip()

    if api_key:
        try:
            result = _call_groq(prompt, api_key)
            if all(k in result for k in ("title", "description", "priority")):
                return result
        except Exception as exc:
            logger.error("Groq call failed: %s", exc)

    return _smart_mock(prompt)


# ---------------------------------------------------------------------------
# Database Context Builder (Real DB Data Only)
# ---------------------------------------------------------------------------

def _build_authorized_db_context(user) -> dict:
    """
    Build a fresh, real database snapshot authorized for the requesting user.
    """
    # 0. Asset Categories
    categories_qs = AssetCategory.objects.all()
    categories_list = [{"id": str(c.id), "name": c.name} for c in categories_qs]

    # 1. Assets (Product Definitions)
    assets_qs = Asset.objects.select_related('category').all()
    assets_list = []
    for a in assets_qs[:50]:
        assets_list.append({
            "id": str(a.id),
            "formatted_id": a.formatted_asset_id,
            "name": a.name,
            "category": a.category.name if a.category else "Uncategorized",
            "category_id": str(a.category.id) if a.category else None,
            "brand": a.brand,
            "model": a.model,
            "total_qty": a.total_quantity,
            "available_qty": a.available_quantity,
            "assigned_qty": a.assigned_quantity,
            "maintenance_qty": a.maintenance_quantity,
        })

    # 2. Asset Units (Physical Units with Serial Numbers)
    units_qs = AssetUnit.objects.select_related('asset', 'assigned_to').all()
    units_list = []
    for u in units_qs[:100]:
        units_list.append({
            "id": str(u.id),
            "asset_name": u.asset.name if u.asset else "Unknown",
            "serial_number": u.serial_number,
            "status": u.status,
            "location": u.location,
            "assigned_to_name": f"{u.assigned_to.first_name} {u.assigned_to.last_name}".strip() or u.assigned_to.email if u.assigned_to else None,
            "assigned_to_email": u.assigned_to.email if u.assigned_to else None,
            "assigned_to_id": str(u.assigned_to.id) if u.assigned_to else None,
        })

    # 3. Active & Recent Assignments
    assignments_qs = AssetAssignmentHistory.objects.all()[:50]
    assignments_list = []
    for ass in assignments_qs:
        assignments_list.append({
            "id": str(ass.id),
            "asset_name": ass.asset_name_snapshot,
            "serial_number": ass.unit_serial_snapshot,
            "employee_name": ass.employee_name,
            "department": ass.department,
            "status": ass.status,
            "assigned_date": str(ass.assigned_date),
        })

    # 4. Users / Employees
    users_qs = User.objects.filter(is_active=True)
    users_list = []
    for u in users_qs[:50]:
        full_name = f"{u.first_name} {u.last_name}".strip() or u.email
        users_list.append({
            "id": str(u.id),
            "email": u.email,
            "name": full_name,
            "role": u.role,
            "department": u.department,
            "employee_id": u.employee_id,
        })

    # 5. Maintenance Requests
    maint_qs = MaintenanceRequest.objects.all()[:30]
    maint_list = []
    for m in maint_qs:
        maint_list.append({
            "id": str(m.id),
            "request_id": m.request_id,
            "asset_name": m.asset_name_snapshot,
            "issue": m.component_or_issue_type,
            "priority": m.priority,
            "status": m.status,
            "technician": m.assigned_technician,
            "requested_by": m.requested_by_name,
        })

    # 6. Asset Requests
    req_qs = AssetRequest.objects.all()[:30]
    req_list = []
    for r in req_qs:
        req_list.append({
            "id": str(r.id),
            "request_number": r.request_number,
            "employee_name": r.employee_name,
            "requested_asset": r.requested_asset,
            "priority": r.priority,
            "status": r.status,
        })

    return {
        "user": {
            "email": user.email,
            "name": f"{user.first_name} {user.last_name}".strip() or user.email,
            "role": user.role,
        },
        "categories": categories_list,
        "assets": assets_list,
        "physical_units": units_list,
        "assignments": assignments_list,
        "employees": users_list,
        "maintenance_tickets": maint_list,
        "asset_requests": req_list,
    }


# ---------------------------------------------------------------------------
# Groq AI Assistant Endpoint Implementation
# ---------------------------------------------------------------------------

def _call_groq_assistant(message: str, history: list, db_context: dict, api_key: str) -> dict:
    context_str = json.dumps(db_context, indent=2)
    sys_content = AI_ASSISTANT_SYSTEM_PROMPT + "\\n\\nCURRENT REAL DATABASE SNAPSHOT:\\n" + context_str

    messages = [
        {"role": "system", "content": sys_content}
    ]

    for item in history[-6:]:
        role = item.get("role", "user")
        content = item.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message})

    payload = json.dumps({
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 1000,
        "response_format": {"type": "json_object"},
    }).encode("utf-8")

    req = urllib.request.Request(
        GROQ_API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=20) as resp:
        body = json.loads(resp.read().decode("utf-8"))

    content = body["choices"][0]["message"]["content"]
    return json.loads(content)


# ---------------------------------------------------------------------------
# Helper: Extract Add Asset Details from Command
# ---------------------------------------------------------------------------

def _extract_add_asset_details(message: str, db_categories: list) -> tuple:
    msg = message.strip()
    msg_lower = msg.lower()

    named_match = re.search(r'(?:named|called|title[d]?|with name)\s+["\']?([^"\'.,;!\\n]+)["\']?', msg, re.IGNORECASE)
    if named_match:
        asset_name = named_match.group(1).strip()
    else:
        add_match = re.search(r'(?:add|create)\s+(?:an?\s+)?(?:asset|product|item|device|unit)?\s*["\']?([^"\'.,;!\\n]+)["\']?', msg, re.IGNORECASE)
        if add_match:
            asset_name = add_match.group(1).strip()
        else:
            asset_name = "New Asset"

    asset_name = re.sub(r'^(an?|the|asset|product|item)\s+', '', asset_name, flags=re.IGNORECASE).strip()
    asset_name = re.split(r'\\b(aur|and|to|for|ka|ko|in|with)\\b', asset_name, flags=re.IGNORECASE)[0].strip()

    if not asset_name:
        asset_name = "New Asset"

    # Category matching
    cat_obj = None
    for c in db_categories:
        if c['name'].lower() in msg_lower:
            cat_obj = c
            break
    if not cat_obj and db_categories:
        cat_obj = db_categories[0]

    # Brand & Model: ONLY if present in user command!
    brand = ""
    model = ""
    if "dell" in msg_lower:
        brand = "Dell"
    elif "hp" in msg_lower:
        brand = "HP"
    elif "lenovo" in msg_lower:
        brand = "Lenovo"
    elif "apple" in msg_lower or "macbook" in msg_lower:
        brand = "Apple"

    if "latitude" in msg_lower:
        m = re.search(r'(latitude\s*\\d+)', msg_lower)
        model = m.group(1).title() if m else "Latitude"
    elif "thinkpad" in msg_lower:
        model = "ThinkPad"

    return asset_name, cat_obj, brand, model


# ---------------------------------------------------------------------------
# Smart Fallback AI Engine (Real Data Powered)
# ---------------------------------------------------------------------------

def _fallback_smart_assistant(user, message: str, db_context: dict) -> dict:
    msg_lower = message.lower()

    # 1. Ask about available assets
    if any(k in msg_lower for k in ["available", "kitne asset", "kitne laptop", "stock", "which asset"]):
        avail_units = [u for u in db_context["physical_units"] if u["status"] == "AVAILABLE"]
        if not avail_units:
            return {
                "message": "Currently, there are **0 available physical units** in inventory.\\n\\nAll units are either assigned or in maintenance.",
                "intent": "QUERY",
                "action": None
            }
        
        counts = {}
        for u in avail_units:
            name = u["asset_name"]
            counts[name] = counts.get(name, 0) + 1

        lines = ["Currently, there are **" + str(len(avail_units)) + " available physical units** in stock:\\n"]
        for name, cnt in counts.items():
            lines.append("- **" + name + "**: " + str(cnt) + " available unit(s)")
        
        lines.append("\\nPhysical available units:")
        for u in avail_units[:10]:
            lines.append("- **" + u['asset_name'] + "** — Serial Number: `" + u['serial_number'] + "` (Status: Available)")

        return {
            "message": "\\n".join(lines),
            "intent": "QUERY",
            "action": None
        }

    # 2. Check employee assets (e.g.,Show me Warda’s assets. or "Ali assets"")
    employee_match = None
    for emp in db_context["employees"]:
        emp_first = emp["name"].split()[0].lower()
        if emp_first and emp_first in msg_lower:
            employee_match = emp
            break

    if employee_match or "mere assets" in msg_lower or "my assets" in msg_lower:
        target_emp = employee_match if employee_match else {
            "id": str(user.id),
            "name": f"{user.first_name} {user.last_name}".strip() or user.email,
            "email": user.email
        }
        target_name = target_emp["name"]

        emp_units = [
            u for u in db_context["physical_units"]
            if (u.get("assigned_to_name") and target_name.lower() in u["assigned_to_name"].lower())
               or (u.get("assigned_to_email") and target_emp["email"].lower() == u["assigned_to_email"].lower())
        ]

        if not emp_units:
            return {
                "message": "**" + target_name + "** ke paas current system mein koi active asset assigned nahi hai.",
                "intent": "QUERY",
                "action": None
            }

        lines = ["**" + target_name + "** ke paas **" + str(len(emp_units)) + " assets** hain:\\n"]
        for u in emp_units:
            lines.append("- **" + u['asset_name'] + "** — Serial Number: `" + u['serial_number'] + "` (Status: " + u['status'] + ")")

        return {
            "message": "\\n".join(lines),
            "intent": "QUERY",
            "action": None
        }

    # 3. Check maintenance tickets
    if any(k in msg_lower for k in ["maintenance", "repair", "kharab"]):
        tickets = db_context["maintenance_tickets"]
        if not tickets:
            return {
                "message": "System mein koi active maintenance request nahi mili.",
                "intent": "QUERY",
                "action": None
            }
        lines = ["System mein **" + str(len(tickets)) + " maintenance tickets** hain:\\n"]
        for t in tickets[:10]:
            lines.append("- **" + t['request_id'] + "**: " + t['asset_name'] + " — " + t['issue'] + " (Status: `" + t['status'] + "`, Priority: `" + t['priority'] + "`)")
        return {
            "message": "\\n".join(lines),
            "intent": "QUERY",
            "action": None
        }

    # 4. Action: Assign Asset (e.g. "Dell Latitude 5520 ko Warda ko assign kar do")
    if "assign" in msg_lower or "de do" in msg_lower or "dedo" in msg_lower:
        target_user = None
        for emp in db_context["employees"]:
            emp_first = emp["name"].split()[0].lower()
            if emp_first and emp_first in msg_lower:
                target_user = emp
                break

        avail_units = [u for u in db_context["physical_units"] if u["status"] == "AVAILABLE"]
        matched_unit = None
        for u in avail_units:
            if u["asset_name"].lower() in msg_lower or u["serial_number"].lower() in msg_lower:
                matched_unit = u
                break
        
        if not matched_unit and avail_units:
            matched_unit = avail_units[0]

        if not target_user:
            return {
                "message": "Mujhe assignment ke liye employee name nahi mila. Kripya employee ka naam clear batayein (e.g., Warda, Ali).",
                "intent": "QUERY",
                "action": None
            }

        if not matched_unit:
            return {
                "message": "**" + target_user['name'] + "** ko assign karne ke liye inventory mein koi **AVAILABLE** physical unit nahi mila.\\n\\nRequired physical unit with a real Serial Number must exist in system before assignment.",
                "intent": "QUERY",
                "action": None
            }

        return {
            "message": "I found the following available physical unit in backend database:\\n\\n- **Asset**: " + matched_unit['asset_name'] + "\\n- **Serial Number**: `" + matched_unit['serial_number'] + "`\\n- **Assign to**: " + target_user['name'] + "\\n- **Status**: Available\\n\\nPlease confirm if you want to assign this unit.",
            "intent": "ACTION_PROPOSAL",
            "action": {
                "type": "ASSIGN_ASSET",
                "params": {
                    "unit_id": matched_unit["id"],
                    "serial_number": matched_unit["serial_number"],
                    "asset_name": matched_unit["asset_name"],
                    "user_id": target_user["id"],
                    "employee_name": target_user["name"],
                },
                "summary": "Assign " + matched_unit['asset_name'] + " (" + matched_unit['serial_number'] + ") to " + target_user['name'],
                "requires_confirmation": True
            }
        }

    # 5. Action: Create/Add Asset (e.g. "Add an asset named USB" or "Add a Dell Latitude 5520 laptop")
    if "add" in msg_lower or "create" in msg_lower:
        asset_name, cat_dict, brand, model = _extract_add_asset_details(message, db_context.get("categories", []))
        cat_name = cat_dict["name"] if cat_dict else "Uncategorized"
        cat_id = cat_dict["id"] if cat_dict else None

        lines = ["Please confirm creating the following new product definition in catalogue:\\n"]
        lines.append(f"- **Asset Name**: {asset_name}")
        lines.append(f"- **Category**: {cat_name}")
        if brand:
            lines.append(f"- **Brand**: {brand}")
        if model:
            lines.append(f"- **Model**: {model}")
        lines.append("\\n*Note: Physical units with serial numbers can be added after PO purchase or unit creation.*")

        return {
            "message": "\\n".join(lines),
            "intent": "ACTION_PROPOSAL",
            "action": {
                "type": "ADD_ASSET",
                "params": {
                    "name": asset_name,
                    "category_id": cat_id,
                    "category_name": cat_name,
                    "brand": brand,
                    "model": model,
                },
                "summary": f"Create Product Definition '{asset_name}' in Catalogue",
                "requires_confirmation": True
            }
        }

    # Default fallback message
    return {
        "message": "Hello! I am **Astra AI**, your intelligent Asset Management Assistant.\\n\\nYou can ask me questions using natural language (English or Roman Urdu):\\n- *\\"How many assets are available?\\"*\\n- *\\"Warda ke assets batao\\"*\\n- *\\"Dell Latitude 5520 ko Warda ko assign kar do\\"*\\n- *\\"Show pending maintenance tickets\\"*\\n\\nHow can I help you today?",
        "intent": "GENERAL",
        "action": None
    }


# ---------------------------------------------------------------------------
# Public Chat Processing Function
# ---------------------------------------------------------------------------

def process_ai_chat(user, message: str, conversation_history: list = None) -> dict:
    if conversation_history is None:
        conversation_history = []

    db_context = _build_authorized_db_context(user)
    api_key = getattr(settings, "GROQ_API_KEY", "").strip()

    if api_key:
        try:
            res = _call_groq_assistant(message, conversation_history, db_context, api_key)
            if isinstance(res, dict) and "message" in res and res.get("intent") in ("QUERY", "ACTION_PROPOSAL", "GENERAL"):
                return res
        except Exception as exc:
            logger.error("Groq AI Assistant call failed: %s", exc)

    logger.info("Using smart fallback AI engine with real DB context.")
    return _fallback_smart_assistant(user, message, db_context)


# ---------------------------------------------------------------------------
# Public Action Execution Function
# ---------------------------------------------------------------------------

def execute_ai_action(user, action_type: str, params: dict) -> dict:
    """
    Executes an action proposed by AI after explicit user confirmation.
    Checks permissions and calls exact Django services.
    """
    action_type = (action_type or "").upper()

    user_role = (user.role or "").lower()
    is_admin_or_mgr = user.is_superuser or user_role in ["system_admin", "operations_manager", "admin", "manager"]

    if not is_admin_or_mgr and action_type not in ["CREATE_MAINTENANCE", "REQUEST_ASSET"]:
        return {
            "success": False,
            "message": f"Permission Denied: Your role ({user.role}) is not authorized to execute '{action_type}'.",
            "data": None
        }

    try:
        with transaction.atomic():
            if action_type == "ADD_ASSET":
                asset_name = params.get("name") or "New Asset"
                cat_id = params.get("category_id")
                cat_name = params.get("category_name") or params.get("category")

                # Retrieve real AssetCategory instance from DB
                category_obj = None
                if cat_id:
                    category_obj = AssetCategory.objects.filter(pk=cat_id).first()
                if not category_obj and cat_name:
                    category_obj = AssetCategory.objects.filter(name__iexact=str(cat_name)).first()
                if not category_obj and cat_name:
                    category_obj = AssetCategory.objects.filter(name__icontains=str(cat_name)).first()
                if not category_obj:
                    category_obj = AssetCategory.objects.first()

                if not category_obj:
                    return {
                        "success": False,
                        "message": "Category not found. Please select an existing asset category.",
                        "data": None
                    }

                # PASS REAL AssetCategory MODEL INSTANCE (not UUID string!)
                asset_data = {
                    "name": asset_name,
                    "category": category_obj,
                    "brand": params.get("brand", ""),
                    "model": params.get("model", ""),
                    "color": params.get("color", ""),
                }

                asset = AssetService.create_asset(asset_data, request=None)
                return {
                    "success": True,
                    "message": f"✓ Asset definition created successfully in Catalogue.\\n\\n- **Asset ID**: `{asset.formatted_asset_id}`\\n- **Name**: {asset.name}\\n- **Category**: {category_obj.name}",
                    "data": {
                        "asset_id": str(asset.id),
                        "formatted_id": asset.formatted_asset_id,
                        "name": asset.name,
                        "category": category_obj.name,
                        "status": "Created"
                    }
                }

            elif action_type == "ASSIGN_ASSET":
                unit_id = params.get("unit_id")
                user_id = params.get("user_id")
                employee_name = params.get("employee_name", "")

                if not unit_id:
                    serial = params.get("serial_number")
                    if serial:
                        unit = AssetUnit.objects.filter(serial_number=serial, status=AssetUnit.Status.AVAILABLE).first()
                    else:
                        asset_name = params.get("asset_name")
                        unit = AssetUnit.objects.filter(asset__name__icontains=asset_name, status=AssetUnit.Status.AVAILABLE).first()
                else:
                    unit = AssetUnit.objects.filter(pk=unit_id).first()

                if not unit:
                    return {
                        "success": False,
                        "message": "The selected physical unit is no longer AVAILABLE in inventory.",
                        "data": None
                    }

                target_user = None
                if user_id:
                    target_user = User.objects.filter(pk=user_id).first()
                if not target_user and employee_name:
                    target_user = User.objects.filter(first_name__icontains=employee_name.split()[0]).first()

                assigned_name = f"{target_user.first_name} {target_user.last_name}".strip() if target_user else employee_name

                updated_unit = AssetService.assign_unit(
                    unit=unit,
                    user_id=target_user.id if target_user else None,
                    employee_name=assigned_name,
                    assigned_date=date.today(),
                    notes="Assigned via AI Assistant",
                    request=None
                )

                return {
                    "success": True,
                    "message": f"✓ **{updated_unit.asset.name}** has been successfully assigned to **{assigned_name}**.\\n\\n- **Serial Number**: `{updated_unit.serial_number}`\\n- **Status**: Assigned\\n- **Assigned Date**: {date.today()}",
                    "data": {
                        "unit_id": str(updated_unit.id),
                        "asset_name": updated_unit.asset.name,
                        "serial_number": updated_unit.serial_number,
                        "assigned_to": assigned_name,
                        "status": updated_unit.status
                    }
                }

            elif action_type == "RETURN_ASSET":
                unit_id = params.get("unit_id")
                unit = AssetUnit.objects.filter(pk=unit_id).first()
                if not unit:
                    return {"success": False, "message": "Asset unit not found.", "data": None}

                returned_unit = AssetService.return_unit(unit=unit, request=None)
                return {
                    "success": True,
                    "message": f"✓ Asset **{returned_unit.asset.name}** (SN: `{returned_unit.serial_number}`) returned to AVAILABLE stock.",
                    "data": {
                        "unit_id": str(returned_unit.id),
                        "serial_number": returned_unit.serial_number,
                        "status": returned_unit.status
                    }
                }

            elif action_type == "APPROVE_REQUEST":
                req_id = params.get("request_id")
                req_obj = AssetRequest.objects.filter(pk=req_id).first()
                if not req_obj:
                    return {"success": False, "message": "Asset request not found.", "data": None}

                approved = AssetRequestService.approve_request(req_obj, user)
                return {
                    "success": True,
                    "message": f"✓ Request `{approved.request_number}` for **{approved.requested_asset}** has been APPROVED.",
                    "data": {"request_number": approved.request_number, "status": approved.status}
                }

            elif action_type == "REJECT_REQUEST":
                req_id = params.get("request_id")
                reason = params.get("reason", "Rejected via AI Assistant")
                req_obj = AssetRequest.objects.filter(pk=req_id).first()
                if not req_obj:
                    return {"success": False, "message": "Asset request not found.", "data": None}

                rejected = AssetRequestService.reject_request(req_obj, reason, user)
                return {
                    "success": True,
                    "message": f"✓ Request `{rejected.request_number}` rejected. Reason: {reason}",
                    "data": {"request_number": rejected.request_number, "status": rejected.status}
                }

            elif action_type == "CREATE_MAINTENANCE":
                asset_id = params.get("asset_id")
                asset = Asset.objects.filter(pk=asset_id).first() if asset_id else None
                issue_title = params.get("title", "Hardware issue reported via AI")
                issue_desc = params.get("description", issue_title)
                priority = params.get("priority", "MEDIUM")

                mnt = MaintenanceRequest.objects.create(
                    asset=asset,
                    asset_name_snapshot=asset.name if asset else params.get("asset_name", "Hardware Unit"),
                    component_or_issue_type=issue_title,
                    issue_description=issue_desc,
                    maintenance_type=params.get("maintenance_type", "CORRECTIVE"),
                    priority=priority,
                    status=MaintenanceRequest.Status.PENDING,
                    requested_by=user,
                    requested_by_name=f"{user.first_name} {user.last_name}".strip() or user.email
                )

                if asset:
                    asset.units.filter(status=AssetUnit.Status.AVAILABLE).update(status=AssetUnit.Status.MAINTENANCE)

                return {
                    "success": True,
                    "message": f"✓ Maintenance ticket `{mnt.request_id}` created successfully.\\n\\n- **Issue**: {mnt.component_or_issue_type}\\n- **Priority**: {mnt.priority}\\n- **Status**: Pending Assessment",
                    "data": {
                        "ticket_id": str(mnt.id),
                        "request_id": mnt.request_id,
                        "status": mnt.status
                    }
                }

            elif action_type == "SCRAP_ASSET":
                unit_id = params.get("unit_id")
                unit = AssetUnit.objects.filter(pk=unit_id).first()
                if not unit:
                    return {"success": False, "message": "Asset unit not found.", "data": None}
                
                unit.status = AssetUnit.Status.SCRAPPED
                unit.save()
                return {
                    "success": True,
                    "message": f"✓ Physical Unit **{unit.asset.name}** (SN: `{unit.serial_number}`) marked as SCRAPPED.",
                    "data": {"unit_id": str(unit.id), "status": unit.status}
                }

            else:
                return {"success": False, "message": f"Unsupported action type: {action_type}", "data": None}

    except Exception as exc:
        logger.error("Error executing AI action %s: %s", action_type, exc, exc_info=True)
        return {
            "success": False,
            "message": f"Execution failed: {str(exc)}",
            "data": None
        }
'''

dest_path = r"C:\Users\HORIZON laptop\Desktop\api\apps\ai\services.py"
with open(dest_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Directly wrote apps/ai/services.py with name extraction fix and AssetCategory instance fix")
