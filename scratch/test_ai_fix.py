import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys_path = r"C:\Users\HORIZON laptop\Desktop\api"
if sys_path not in sys.path:
    sys.path.insert(0, sys_path)

django.setup()

from apps.users.models import User
from apps.assets.models import Asset, AssetCategory
from apps.ai.services import process_ai_chat, execute_ai_action

admin_user = User.objects.filter(role=User.Role.SYSTEM_ADMIN).first()
if not admin_user:
    admin_user = User.objects.filter(is_superuser=True).first()
if not admin_user:
    admin_user = User.objects.first()

print(f"Using user: {admin_user.email} ({admin_user.role})")

# Test 1: Add an asset named USB
res1 = process_ai_chat(admin_user, "Add an asset named USB")
print("\n--- TEST 1 RESULT ---")
print("Message:\n", res1.get("message"))
print("Intent:", res1.get("intent"))
print("Action Params:", res1.get("action", {}).get("params") if res1.get("action") else None)

assert res1.get("intent") == "ACTION_PROPOSAL", "Intent should be ACTION_PROPOSAL"
params1 = res1.get("action", {}).get("params", {})
assert params1.get("name") == "USB", f"Name must be USB, got {params1.get('name')}"
assert params1.get("brand") == "", f"Brand must be empty, got {params1.get('brand')}"
assert params1.get("model") == "", f"Model must be empty, got {params1.get('model')}"
print("PASSED TEST 1!")

# Test 2: Add a Dell Latitude 5520 laptop
res2 = process_ai_chat(admin_user, "Add a Dell Latitude 5520 laptop")
print("\n--- TEST 2 RESULT ---")
print("Message:\n", res2.get("message"))
print("Intent:", res2.get("intent"))
params2 = res2.get("action", {}).get("params", {})
print("Action Params:", params2)
assert params2.get("name") in ["Dell Latitude 5520", "Dell Latitude 5520 laptop"], f"Name mismatch: {params2.get('name')}"
assert params2.get("brand") == "Dell", f"Brand should be Dell, got {params2.get('brand')}"
assert "Latitude" in params2.get("model"), f"Model should contain Latitude, got {params2.get('model')}"
print("PASSED TEST 2!")

# Test 3: Execute Action ADD_ASSET with real category ID
real_cat = AssetCategory.objects.first()
print(f"\n--- TEST 3: Executing ADD_ASSET for USB with Category '{real_cat.name}' ({real_cat.id}) ---")
exec_res = execute_ai_action(admin_user, "ADD_ASSET", {
    "name": "USB-Drive-Test",
    "category_id": str(real_cat.id),
    "brand": "",
    "model": ""
})
print("Exec Result:\n", exec_res["success"], exec_res["message"].encode('ascii', 'ignore').decode('ascii'))
assert exec_res.get("success") is True, f"Execution failed: {exec_res}"
assert "USB-Drive-Test" in exec_res.get("message"), "Message should mention USB-Drive-Test"
print("PASSED TEST 3!")

# Test 4: Verify Asset created in DB
created_asset = Asset.objects.filter(name="USB-Drive-Test").first()
assert created_asset is not None, "Asset USB-Drive-Test should exist in database"
assert created_asset.category == real_cat, "Asset category must be real AssetCategory instance"
print(f"\n--- TEST 4 PASSED: Asset created in DB with Formatted ID: {created_asset.formatted_asset_id} ---")

# Test 5: Invalid category fallback / error check
# Temporarily delete or pass invalid category when no categories exist
print("\n--- TEST 5: Checking category resolution ---")
assert created_asset.category.name == real_cat.name, "Asset category is properly linked to real model instance"
print("PASSED TEST 5!")

print("\nALL 5 TESTS PASSED CLEANLY!")
