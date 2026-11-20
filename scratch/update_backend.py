import os
import sys

BACKEND_DIR = r"d:\Asset-Managment-backend"

# 1. Update config/settings.py CORS configuration
settings_path = os.path.join(BACKEND_DIR, "config", "settings.py")
with open(settings_path, "r", encoding="utf-8") as f:
    settings_code = f.read()

cors_patch = """
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
"""

if "CORS_ALLOW_METHODS" in settings_code:
    # Replace CORS section
    lines = settings_code.split("\n")
    new_lines = []
    skip = False
    for line in lines:
        if "CORS_ALLOW_ALL_ORIGINS" in line:
            skip = True
            new_lines.append(cors_patch)
        elif skip and (line.startswith("AUTH_USER_MODEL") or line.startswith("REST_FRAMEWORK")):
            skip = False
            new_lines.append(line)
        elif not skip:
            new_lines.append(line)
    settings_code = "\n".join(new_lines)
    with open(settings_path, "w", encoding="utf-8") as f:
        f.write(settings_code)

print("Updated settings.py CORS configuration.")

# 2. Update apps/maintenance/models.py
models_path = os.path.join(BACKEND_DIR, "apps", "maintenance", "models.py")
models_code = """import uuid
from django.conf import settings
from django.db import models

from apps.assets.models import Asset


class MaintenanceRequest(models.Model):
    \"\"\"
    Matches frontend MaintenanceRequest interface.
    \"\"\"
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        VERIFIED = 'VERIFIED', 'Verified'
        CANCELLED = 'CANCELLED', 'Cancelled'
        UNREPAIRABLE = 'UNREPAIRABLE', 'Unrepairable'
        RESOLVED = 'RESOLVED', 'Resolved'
        NOT_REPAIRABLE = 'NOT_REPAIRABLE', 'Not Repairable'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    class MaintenanceType(models.TextChoices):
        PREVENTIVE = 'PREVENTIVE', 'Preventive'
        CORRECTIVE = 'CORRECTIVE', 'Corrective'
        EMERGENCY = 'EMERGENCY', 'Emergency'
        INSPECTION = 'INSPECTION', 'Inspection'
        UPGRADE = 'UPGRADE', 'Upgrade'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_id = models.CharField(max_length=50, unique=True, db_index=True)  # e.g. "MNT-001"

    asset = models.ForeignKey(
        Asset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_requests'
    )
    asset_name_snapshot = models.CharField(max_length=255, blank=True, default='')

    component_or_issue_type = models.CharField(max_length=200)
    issue_description = models.TextField()
    maintenance_type = models.CharField(max_length=20, choices=MaintenanceType.choices)
    priority = models.CharField(max_length=20, choices=Priority.choices, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )

    notes = models.TextField(blank=True, default='')  # resolution notes on completion
    work_done = models.TextField(blank=True, default='')
    technician_notes = models.TextField(blank=True, default='')
    assigned_technician = models.CharField(max_length=200, blank=True, default='')

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_requests'
    )
    requested_by_name = models.CharField(max_length=200, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'maintenance_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
        ]

    def __str__(self):
        return f"{self.request_id} - {self.asset.name if self.asset else ''} ({self.status})"

    def save(self, *args, **kwargs):
        if self.asset and not self.asset_name_snapshot:
            self.asset_name_snapshot = self.asset.name
        super().save(*args, **kwargs)


class MaintenanceTimelineEntry(models.Model):
    \"\"\"
    Matches frontend MaintenanceTimelineEntry interface.
    \"\"\"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    maintenance_request = models.ForeignKey(
        MaintenanceRequest,
        on_delete=models.CASCADE,
        related_name='timeline'
    )
    status = models.CharField(max_length=20, choices=MaintenanceRequest.Status.choices)
    label = models.CharField(max_length=200)
    timestamp = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True, default='')
    work_done = models.TextField(blank=True, default='')
    completed_by = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        db_table = 'maintenance_timeline_entries'
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.maintenance_request.request_id} - {self.status}"
"""

with open(models_path, "w", encoding="utf-8") as f:
    f.write(models_code)

print("Updated models.py.")

# 3. Update apps/maintenance/serializers.py
serializers_path = os.path.join(BACKEND_DIR, "apps", "maintenance", "serializers.py")
serializers_code = """from rest_framework import serializers

from apps.assets.models import Asset
from .models import MaintenanceRequest, MaintenanceTimelineEntry


class MaintenanceTimelineEntrySerializer(serializers.ModelSerializer):
    completedBy = serializers.CharField(source='completed_by', read_only=True, default='')
    workDone = serializers.CharField(source='work_done', read_only=True, default='')

    class Meta:
        model = MaintenanceTimelineEntry
        fields = ['id', 'status', 'label', 'timestamp', 'note', 'workDone', 'completedBy']


class MaintenanceHistoryItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    date = serializers.SerializerMethodField()
    issue = serializers.CharField(source='component_or_issue_type')
    action = serializers.CharField(source='notes')

    def get_date(self, obj):
        ref_date = obj.completed_at or obj.updated_at
        return ref_date.date().isoformat() if ref_date else None


class MaintenanceListSerializer(serializers.ModelSerializer):
    requestId = serializers.CharField(source='request_id')
    assetId = serializers.PrimaryKeyRelatedField(source='asset', read_only=True)
    assetName = serializers.CharField(source='asset.name', read_only=True)
    assetTag = serializers.CharField(source='asset.asset_tag', read_only=True, default='')
    componentOrIssueType = serializers.CharField(source='component_or_issue_type')
    issueDescription = serializers.CharField(source='issue_description')
    maintenanceType = serializers.CharField(source='maintenance_type')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    workDone = serializers.CharField(source='work_done', read_only=True, default='')
    technicianNotes = serializers.CharField(source='technician_notes', read_only=True, default='')
    assignedTechnician = serializers.CharField(source='assigned_technician', read_only=True, default='')

    class Meta:
        model = MaintenanceRequest
        fields = [
            'id', 'requestId', 'assetId', 'assetName', 'assetTag',
            'componentOrIssueType', 'issueDescription', 'maintenanceType',
            'priority', 'status', 'createdAt', 'updatedAt', 'workDone',
            'technicianNotes', 'assignedTechnician',
        ]


class MaintenanceDetailSerializer(serializers.ModelSerializer):
    requestId = serializers.CharField(source='request_id')
    assetId = serializers.PrimaryKeyRelatedField(source='asset', read_only=True)
    assetName = serializers.CharField(source='asset.name', read_only=True)
    assetTag = serializers.CharField(source='asset.asset_tag', read_only=True, default='')
    componentOrIssueType = serializers.CharField(source='component_or_issue_type')
    issueDescription = serializers.CharField(source='issue_description')
    maintenanceType = serializers.CharField(source='maintenance_type')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    completedAt = serializers.DateTimeField(source='completed_at', read_only=True)
    requestedBy = serializers.PrimaryKeyRelatedField(source='requested_by', read_only=True)
    requestedByName = serializers.CharField(source='requested_by_name', read_only=True)
    workDone = serializers.CharField(source='work_done', read_only=True, default='')
    technicianNotes = serializers.CharField(source='technician_notes', read_only=True, default='')
    assignedTechnician = serializers.CharField(source='assigned_technician', read_only=True, default='')

    timeline = MaintenanceTimelineEntrySerializer(many=True, read_only=True)
    assetMaintenanceHistory = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceRequest
        fields = [
            'id', 'requestId', 'assetId', 'assetName', 'assetTag',
            'componentOrIssueType', 'issueDescription', 'maintenanceType',
            'priority', 'status', 'createdAt', 'updatedAt', 'completedAt',
            'timeline', 'assetMaintenanceHistory', 'notes', 'workDone',
            'technicianNotes', 'assignedTechnician',
            'requestedBy', 'requestedByName', 'department',
        ]

    def get_assetMaintenanceHistory(self, obj):
        past = MaintenanceRequest.objects.filter(
            asset=obj.asset,
            status__in=[MaintenanceRequest.Status.COMPLETED, MaintenanceRequest.Status.VERIFIED, MaintenanceRequest.Status.RESOLVED],
        ).exclude(id=obj.id).order_by('-completed_at')
        return MaintenanceHistoryItemSerializer(past, many=True).data


class CreateMaintenanceRequestSerializer(serializers.Serializer):
    assetId = serializers.PrimaryKeyRelatedField(
        source='asset', queryset=Asset.objects.all()
    )
    componentOrIssueType = serializers.CharField(source='component_or_issue_type')
    issueDescription = serializers.CharField(source='issue_description')
    maintenanceType = serializers.ChoiceField(
        source='maintenance_type', choices=MaintenanceRequest.MaintenanceType.choices
    )
    priority = serializers.ChoiceField(choices=MaintenanceRequest.Priority.choices)
    assignedTechnician = serializers.CharField(source='assigned_technician', required=False, allow_blank=True, default='')


class UpdateMaintenanceStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=MaintenanceRequest.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True, default='')


class MaintenanceWorkUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=MaintenanceRequest.Status.choices)
    workDone = serializers.CharField(source='work_done', required=True)
    technicianNotes = serializers.CharField(source='technician_notes', required=False, allow_blank=True, default='')
    technicianName = serializers.CharField(required=False, allow_blank=True, default='')


class MaintenanceStatsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    pending = serializers.IntegerField()
    inProgress = serializers.IntegerField()
    completed = serializers.IntegerField()
"""

with open(serializers_path, "w", encoding="utf-8") as f:
    f.write(serializers_code)

print("Updated serializers.py.")

# 4. Update apps/maintenance/views.py
views_path = os.path.join(BACKEND_DIR, "apps", "maintenance", "views.py")
views_code = """from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MaintenanceRequest, MaintenanceTimelineEntry
from .serializers import (
    CreateMaintenanceRequestSerializer,
    MaintenanceDetailSerializer,
    MaintenanceListSerializer,
    MaintenanceStatsSerializer,
    UpdateMaintenanceStatusSerializer,
    MaintenanceWorkUpdateSerializer,
)


def _generate_request_id():
    count = MaintenanceRequest.objects.count() + 1
    return f"MNT-{str(count).zfill(3)}"


STATUS_LABELS = {
    MaintenanceRequest.Status.PENDING: 'Request Created',
    MaintenanceRequest.Status.IN_PROGRESS: 'Work Started',
    MaintenanceRequest.Status.COMPLETED: 'Work Completed',
    MaintenanceRequest.Status.RESOLVED: 'Work Resolved',
    MaintenanceRequest.Status.VERIFIED: 'Quality Verified',
    MaintenanceRequest.Status.CANCELLED: 'Request Cancelled',
    MaintenanceRequest.Status.UNREPAIRABLE: 'Marked Not Repairable',
    MaintenanceRequest.Status.NOT_REPAIRABLE: 'Marked Not Repairable',
}


class MaintenanceListCreateView(ListCreateAPIView):
    queryset = MaintenanceRequest.objects.select_related('asset').all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateMaintenanceRequestSerializer
        return MaintenanceListSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateMaintenanceRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        maintenance_request = MaintenanceRequest.objects.create(
            request_id=_generate_request_id(),
            asset=serializer.validated_data['asset'],
            component_or_issue_type=serializer.validated_data['component_or_issue_type'],
            issue_description=serializer.validated_data['issue_description'],
            maintenance_type=serializer.validated_data['maintenance_type'],
            priority=serializer.validated_data['priority'],
            status=MaintenanceRequest.Status.PENDING,
            assigned_technician=serializer.validated_data.get('assigned_technician', ''),
            requested_by=request.user if request.user.is_authenticated else None,
            requested_by_name=f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email,
        )

        MaintenanceTimelineEntry.objects.create(
            maintenance_request=maintenance_request,
            status=MaintenanceRequest.Status.PENDING,
            label=STATUS_LABELS[MaintenanceRequest.Status.PENDING],
        )

        try:
            from apps.audit.services import AuditLogService
            AuditLogService.log_action(
                action='MAINTENANCE_CREATED',
                module='MAINTENANCE',
                asset=maintenance_request.asset,
                asset_name=maintenance_request.asset.name if maintenance_request.asset else '',
                description=f"Maintenance ticket {maintenance_request.request_id} created for '{maintenance_request.asset.name if maintenance_request.asset else 'Asset'}'. Issue: {maintenance_request.component_or_issue_type}",
                request=request,
                new_value={
                    'ticket_id': maintenance_request.request_id,
                    'priority': maintenance_request.priority,
                    'type': maintenance_request.maintenance_type,
                    'status': maintenance_request.status
                }
            )
        except Exception:
            pass

        try:
            from apps.notifications.services import create_system_notification
            asset_name = maintenance_request.asset.name if maintenance_request.asset else 'Asset'
            create_system_notification(
                title=f"Maintenance Ticket Created ({maintenance_request.request_id})",
                message=f"Maintenance request {maintenance_request.request_id} created for '{asset_name}'. Issue: {maintenance_request.component_or_issue_type}.",
                notification_type='MAINTENANCE',
                sub_type='MAINTENANCE_CREATED',
                related_asset_id=maintenance_request.asset.id if maintenance_request.asset else None,
                related_asset_name=asset_name,
                related_maintenance_id=maintenance_request.id,
                related_maintenance_request_id=maintenance_request.request_id
            )
        except Exception:
            pass

        output = MaintenanceDetailSerializer(maintenance_request)
        return Response(output.data, status=status.HTTP_201_CREATED)


class MaintenanceDetailView(RetrieveUpdateDestroyAPIView):
    queryset = MaintenanceRequest.objects.select_related('asset').all()
    serializer_class = MaintenanceDetailSerializer


class MaintenanceStatusUpdateView(APIView):
    \"\"\"PATCH /api/maintenance/<id>/status/\"\"\"

    def patch(self, request, pk):
        try:
            maintenance_request = MaintenanceRequest.objects.get(pk=pk)
        except MaintenanceRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateMaintenanceStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = maintenance_request.status
        new_status = serializer.validated_data['status']
        note = serializer.validated_data.get('note', '')

        maintenance_request.status = new_status
        if new_status in [
            MaintenanceRequest.Status.COMPLETED,
            MaintenanceRequest.Status.VERIFIED,
            MaintenanceRequest.Status.RESOLVED,
            MaintenanceRequest.Status.UNREPAIRABLE,
            MaintenanceRequest.Status.NOT_REPAIRABLE,
        ]:
            maintenance_request.completed_at = timezone.now()
            if note:
                maintenance_request.notes = note
        maintenance_request.save()

        MaintenanceTimelineEntry.objects.create(
            maintenance_request=maintenance_request,
            status=new_status,
            label=STATUS_LABELS.get(new_status, new_status),
            note=note,
            completed_by=(
                f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
                if request.user.is_authenticated else ''
            ),
        )

        output = MaintenanceDetailSerializer(maintenance_request)
        return Response(output.data, status=status.HTTP_200_OK)


class MaintenanceWorkUpdateView(APIView):
    \"\"\"PATCH /api/maintenance/<id>/work-update/\"\"\"

    def patch(self, request, pk):
        try:
            maintenance_request = MaintenanceRequest.objects.get(pk=pk)
        except MaintenanceRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = MaintenanceWorkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = maintenance_request.status
        new_status = serializer.validated_data['status']
        work_done = serializer.validated_data.get('work_done', '')
        technician_notes = serializer.validated_data.get('technician_notes', '')
        tech_name = serializer.validated_data.get('technicianName', '') or (
            f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
            if request.user.is_authenticated else 'Technician'
        )

        maintenance_request.status = new_status
        maintenance_request.work_done = work_done
        maintenance_request.technician_notes = technician_notes
        if work_done:
            maintenance_request.notes = work_done

        if new_status in [
            MaintenanceRequest.Status.COMPLETED,
            MaintenanceRequest.Status.VERIFIED,
            MaintenanceRequest.Status.RESOLVED,
            MaintenanceRequest.Status.UNREPAIRABLE,
            MaintenanceRequest.Status.NOT_REPAIRABLE,
        ]:
            maintenance_request.completed_at = timezone.now()

        maintenance_request.save()

        label_map = {
            MaintenanceRequest.Status.IN_PROGRESS: 'Work In Progress',
            MaintenanceRequest.Status.RESOLVED: 'Work Resolved',
            MaintenanceRequest.Status.NOT_REPAIRABLE: 'Reported Not Repairable',
            MaintenanceRequest.Status.UNREPAIRABLE: 'Reported Not Repairable',
        }
        entry_label = label_map.get(new_status, STATUS_LABELS.get(new_status, new_status))

        MaintenanceTimelineEntry.objects.create(
            maintenance_request=maintenance_request,
            status=new_status,
            label=entry_label,
            note=technician_notes,
            work_done=work_done,
            completed_by=tech_name,
        )

        # Asset Lifecycle integration
        if maintenance_request.asset:
            asset = maintenance_request.asset
            if new_status in [MaintenanceRequest.Status.RESOLVED, MaintenanceRequest.Status.COMPLETED]:
                if hasattr(asset, 'status'):
                    asset.status = 'AVAILABLE'
                    asset.save()

        # Audit log integration
        try:
            from apps.audit.services import AuditLogService
            action_map = {
                MaintenanceRequest.Status.IN_PROGRESS: 'MAINTENANCE_STARTED',
                MaintenanceRequest.Status.RESOLVED: 'MAINTENANCE_RESOLVED',
                MaintenanceRequest.Status.COMPLETED: 'MAINTENANCE_RESOLVED',
                MaintenanceRequest.Status.NOT_REPAIRABLE: 'MAINTENANCE_UPDATED',
                MaintenanceRequest.Status.UNREPAIRABLE: 'MAINTENANCE_UPDATED',
            }
            action_name = action_map.get(new_status, 'MAINTENANCE_UPDATED')

            AuditLogService.log_action(
                action=action_name,
                module='MAINTENANCE',
                asset=maintenance_request.asset,
                asset_name=maintenance_request.asset.name if maintenance_request.asset else '',
                description=f"Maintenance ticket {maintenance_request.request_id} work update submitted by {tech_name}. Status: {new_status}. Findings: {work_done}",
                request=request,
                old_value={'status': old_status},
                new_value={'status': new_status, 'work_done': work_done, 'notes': technician_notes}
            )
        except Exception:
            pass

        # Notification integration
        try:
            from apps.notifications.services import create_system_notification
            asset_name = maintenance_request.asset.name if maintenance_request.asset else 'Asset'
            create_system_notification(
                title=f"Maintenance Work Update ({maintenance_request.request_id})",
                message=f"Technician {tech_name} updated ticket {maintenance_request.request_id} ({asset_name}) to status {new_status}.",
                notification_type='MAINTENANCE',
                sub_type='MAINTENANCE_UPDATED',
                related_asset_id=maintenance_request.asset.id if maintenance_request.asset else None,
                related_asset_name=asset_name,
                related_maintenance_id=maintenance_request.id,
                related_maintenance_request_id=maintenance_request.request_id
            )
        except Exception:
            pass

        output = MaintenanceDetailSerializer(maintenance_request)
        return Response(output.data, status=status.HTTP_200_OK)


class MaintenanceStatsView(APIView):
    \"\"\"GET /api/maintenance/stats/\"\"\"

    def get(self, request):
        qs = MaintenanceRequest.objects.all()
        data = {
            'total': qs.count(),
            'pending': qs.filter(status=MaintenanceRequest.Status.PENDING).count(),
            'inProgress': qs.filter(status=MaintenanceRequest.Status.IN_PROGRESS).count(),
            'completed': qs.filter(
                status__in=[MaintenanceRequest.Status.COMPLETED, MaintenanceRequest.Status.VERIFIED, MaintenanceRequest.Status.RESOLVED]
            ).count(),
        }
        return Response(MaintenanceStatsSerializer(data).data, status=status.HTTP_200_OK)
"""

with open(views_path, "w", encoding="utf-8") as f:
    f.write(views_code)

print("Updated views.py.")

# 5. Update apps/maintenance/urls.py
urls_path = os.path.join(BACKEND_DIR, "apps", "maintenance", "urls.py")
urls_code = """from django.urls import path
from .views import (
    MaintenanceListCreateView,
    MaintenanceDetailView,
    MaintenanceStatusUpdateView,
    MaintenanceWorkUpdateView,
    MaintenanceStatsView,
)

app_name = 'maintenance'

urlpatterns = [
    path('', MaintenanceListCreateView.as_view(), name='maintenance-list'),
    path('stats/', MaintenanceStatsView.as_view(), name='maintenance-stats'),
    path('<uuid:pk>/', MaintenanceDetailView.as_view(), name='maintenance-detail'),
    path('<uuid:pk>/status/', MaintenanceStatusUpdateView.as_view(), name='maintenance-status'),
    path('<uuid:pk>/work-update/', MaintenanceWorkUpdateView.as_view(), name='maintenance-work-update'),
]
"""

with open(urls_path, "w", encoding="utf-8") as f:
    f.write(urls_code)

print("Updated urls.py.")
