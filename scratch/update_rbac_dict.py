path = r"C:\Users\HORIZON laptop\Desktop\api\apps\authentication\permissions.py"

content = """from rest_framework.permissions import BasePermission


class RBACPermission(BasePermission):
    \"\"\"
    Role & Individual Permission Access Control.
    Views can specify:
    - `required_permissions = {'GET': 'asset.view', 'POST': 'asset.create'}`
    - or `required_permission = 'asset.create'`
    - and/or `required_roles = ['system_admin', 'operations_manager']`
    \"\"\"
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.is_active:
            return False

        # System admin always has full permission
        user_role = getattr(request.user, 'role', '')
        if user_role == 'system_admin' or getattr(request.user, 'is_superuser', False):
            return True

        req_perm = None
        method_perms = getattr(view, 'required_permissions', None)
        if isinstance(method_perms, dict):
            req_perm = method_perms.get(request.method)

        if not req_perm:
            req_perm = getattr(view, 'required_permission', None)

        if req_perm:
            if hasattr(request.user, 'has_perm_code'):
                return request.user.has_perm_code(req_perm)
            return False

        required_roles = getattr(view, 'required_roles', None)
        if required_roles:
            return user_role in required_roles

        return True
"""

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated authentication/permissions.py with dictionary mapping support")
