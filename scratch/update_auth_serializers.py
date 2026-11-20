path = r"C:\Users\HORIZON laptop\Desktop\api\apps\authentication\serializers.py"

content = """from rest_framework import serializers
from apps.users.models import User
from .validators import validate_password_complexity


class LoginSerializer(serializers.Serializer):
    \"\"\"
    Login only accepts email + password.
    Role is NOT part of the request -- it is determined by the backend
    from the user record and returned in the response.
    \"\"\"
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate_email(self, value):
        return value.strip().lower()


class UserSummarySerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'permissions']

    def get_permissions(self, obj):
        if hasattr(obj, 'get_effective_permissions'):
            return obj.get_effective_permissions()
        return []


class LoginResponseSerializer(serializers.Serializer):
    \"\"\"
    Field names match the proposal spec exactly: 'access' and 'refresh'
    (NOT 'access_token' / 'refresh_token').
    \"\"\"
    access = serializers.CharField()
    refresh = serializers.CharField()
    role = serializers.CharField()
    must_change_password = serializers.BooleanField()
    user = UserSummarySerializer()
    permissions = serializers.SerializerMethodField()

    def get_permissions(self, obj):
        user = obj.get('user')
        if user and hasattr(user, 'get_effective_permissions'):
            return user.get_effective_permissions()
        return []


class RefreshSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=True)


class RefreshResponseSerializer(serializers.Serializer):
    access = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_new_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        new_password = attrs.get('new_password')
        confirm_new_password = attrs.get('confirm_new_password')

        if new_password != confirm_new_password:
            raise serializers.ValidationError(
                {"confirm_new_password": "New passwords do not match."}
            )

        validate_password_complexity(new_password)
        return attrs
"""

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated authentication/serializers.py")
