import os

models_path = r"C:\Users\HORIZON laptop\Desktop\api\apps\users\models.py"

with open(models_path, "r", encoding="utf-8") as f:
    content = f.read()

all_perms_code = """
ALL_SYSTEM_PERMISSIONS = [
    'asset.view', 'asset.create', 'asset.edit', 'asset.delete',
    'asset.assign', 'asset.transfer', 'asset.return', 'asset.retire', 'asset.history.view',
    'purchase.view', 'purchase.create', 'purchase.edit', 'purchase.delete',
    'assignment.view', 'assignment.create', 'assignment.transfer', 'assignment.return', 'assignment.history.view',
    'maintenance.view', 'maintenance.create', 'maintenance.manage', 'maintenance.status.update',
    'depreciation.view', 'depreciation.manage',
    'notification.view', 'notification.manage',
    'report.view',
]

DEFAULT_ROLE_PERMISSIONS = {
    'system_admin': ALL_SYSTEM_PERMISSIONS,
    'operations_manager': ALL_SYSTEM_PERMISSIONS,
    'external_technician': [
        'maintenance.view', 'maintenance.create', 'maintenance.manage', 'maintenance.status.update',
        'notification.view',
    ],
    'employee': [
        'notification.view',
    ],
}
"""

if "ALL_SYSTEM_PERMISSIONS" not in content:
    content = content.replace("class UserManager(BaseUserManager):", all_perms_code + "\n\nclass UserManager(BaseUserManager):")

if "permissions = models.JSONField" not in content:
    content = content.replace(
        "role = models.CharField(max_length=50, choices=Role.choices, default=Role.EMPLOYEE)",
        "role = models.CharField(max_length=50, choices=Role.choices, default=Role.EMPLOYEE)\n    permissions = models.JSONField(default=list, blank=True)"
    )

methods_code = """
    def get_effective_permissions(self):
        if self.role == self.Role.SYSTEM_ADMIN or self.is_superuser:
            return ALL_SYSTEM_PERMISSIONS
        if self.permissions is not None and isinstance(self.permissions, list) and len(self.permissions) > 0:
            return self.permissions
        role_key = (self.role or '').lower()
        return DEFAULT_ROLE_PERMISSIONS.get(role_key, [])

    def has_perm_code(self, code: str) -> bool:
        if self.role == self.Role.SYSTEM_ADMIN or self.is_superuser:
            return True
        eff = self.get_effective_permissions()
        return '*' in eff or code in eff
"""

if "def get_effective_permissions" not in content:
    content = content.replace("USERNAME_FIELD = 'email'", methods_code + "\n    USERNAME_FIELD = 'email'")

with open(models_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated models.py")
