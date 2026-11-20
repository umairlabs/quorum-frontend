path = r"C:\Users\HORIZON laptop\Desktop\api\apps\users\serializers.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add permissions field to UserSerializer
if "permissions = serializers.SerializerMethodField()" not in content:
    content = content.replace(
        "    lastLogin = serializers.DateTimeField(source='last_login', read_only=True, allow_null=True)",
        "    lastLogin = serializers.DateTimeField(source='last_login', read_only=True, allow_null=True)\n    permissions = serializers.SerializerMethodField()"
    )
    content = content.replace(
        "'createdAt', 'lastLogin',",
        "'createdAt', 'lastLogin', 'permissions',"
    )
    content += """

class UserPermissionsSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(source='id', read_only=True)
    role = serializers.CharField(read_only=True)
    permissions = serializers.ListField(
        child=serializers.CharField(),
        required=True
    )

    def validate_permissions(self, value):
        from .models import ALL_SYSTEM_PERMISSIONS
        invalid = [code for code in value if code not in ALL_SYSTEM_PERMISSIONS]
        if invalid:
            raise serializers.ValidationError(f"Invalid permission codes: {', '.join(invalid)}")
        return value
"""

if "def get_permissions(self, obj):" not in content:
    content = content.replace(
        "    def get_avatarInitials(self, obj) -> str:",
        """    def get_permissions(self, obj):
        if hasattr(obj, 'get_effective_permissions'):
            return obj.get_effective_permissions()
        return []

    def get_avatarInitials(self, obj) -> str:"""
    )

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated users/serializers.py")
