path_views = r"C:\Users\HORIZON laptop\Desktop\api\apps\users\views.py"
path_urls = r"C:\Users\HORIZON laptop\Desktop\api\apps\users\urls.py"

with open(path_views, "r", encoding="utf-8") as f:
    content_views = f.read()

if "UserPermissionsSerializer" not in content_views:
    content_views = content_views.replace(
        "from .serializers import UserSerializer, CreateUserSerializer, UpdateUserSerializer",
        "from .serializers import UserSerializer, CreateUserSerializer, UpdateUserSerializer, UserPermissionsSerializer"
    )

permissions_view_code = """

class UserPermissionsView(APIView):
    \"\"\"
    GET  /api/users/<uuid:pk>/permissions/ -> view user permissions
    PUT  /api/users/<uuid:pk>/permissions/ -> update user permissions
    \"\"\"
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return Response({
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role,
            "permissions": user.get_effective_permissions()
        })

    def put(self, request, pk):
        self.required_roles = ['system_admin', 'super_admin', 'admin']
        if not RBACPermission().has_permission(request, self):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        user = get_object_or_404(User, pk=pk)

        if user.role == User.Role.SYSTEM_ADMIN or user.is_superuser:
            return Response(
                {"detail": "System Administrator permissions are managed by system role and cannot be modified."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = UserPermissionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_perms = user.get_effective_permissions()
        new_perms = serializer.validated_data['permissions']

        user.permissions = new_perms
        user.save(update_fields=['permissions'])

        try:
            from apps.audit.services import AuditLogService
            AuditLogService.log_action(
                action='USER_PERMISSIONS_UPDATED',
                module='USERS',
                description=f"Updated permissions for user {user.email} ({user.role})",
                user=request.user,
                old_value={"permissions": old_perms},
                new_value={"permissions": new_perms},
                request=request
            )
        except Exception as e:
            print("Audit log error:", e)

        return Response({
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role,
            "permissions": user.get_effective_permissions()
        })
"""

if "class UserPermissionsView" not in content_views:
    content_views += permissions_view_code
    with open(path_views, "w", encoding="utf-8") as f:
        f.write(content_views)
    print("Successfully updated users/views.py")

with open(path_urls, "r", encoding="utf-8") as f:
    content_urls = f.read()

if "UserPermissionsView" not in content_urls:
    content_urls = content_urls.replace(
        "from .views import UserListCreateView, UserDetailView, UserStatusView",
        "from .views import UserListCreateView, UserDetailView, UserStatusView, UserPermissionsView"
    )
    content_urls = content_urls.replace(
        "path('<uuid:pk>/status/', UserStatusView.as_view(), name='user-status'),",
        "path('<uuid:pk>/status/', UserStatusView.as_view(), name='user-status'),\n    path('<uuid:pk>/permissions/', UserPermissionsView.as_view(), name='user-permissions'),"
    )
    with open(path_urls, "w", encoding="utf-8") as f:
        f.write(content_urls)
    print("Successfully updated users/urls.py")
