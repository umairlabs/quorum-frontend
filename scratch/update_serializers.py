import os

serializers_path = r"C:\Users\HORIZON laptop\Desktop\api\apps\ai\serializers.py"

content = '''from rest_framework import serializers


class GenerateMaintenanceIssueSerializer(serializers.Serializer):
    """Input: a short casual description of the issue."""
    prompt = serializers.CharField(
        min_length=5,
        max_length=500,
        error_messages={
            "min_length": "Please provide at least 5 characters.",
            "max_length": "Description must be under 500 characters.",
            "blank":      "Prompt cannot be empty.",
        }
    )


class GeneratedMaintenanceIssueSerializer(serializers.Serializer):
    """Output: AI-generated professional maintenance request fields."""
    title       = serializers.CharField()
    description = serializers.CharField()
    priority    = serializers.ChoiceField(choices=["LOW", "MEDIUM", "HIGH", "CRITICAL"])


class AIChatInputSerializer(serializers.Serializer):
    """Input payload for AI Chat Assistant."""
    message = serializers.CharField(
        min_length=1,
        max_length=2000,
        error_messages={"blank": "Message cannot be empty."}
    )
    conversation_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )


class AIChatOutputSerializer(serializers.Serializer):
    """Output response for AI Chat Assistant."""
    message = serializers.CharField()
    intent = serializers.ChoiceField(choices=["QUERY", "ACTION_PROPOSAL", "GENERAL"], default="QUERY")
    action = serializers.DictField(required=False, allow_null=True, default=None)


class AIExecuteActionSerializer(serializers.Serializer):
    """Input payload for executing an AI proposed action."""
    action_type = serializers.CharField()
    params = serializers.DictField(required=False, default=dict)


class AIActionResultSerializer(serializers.Serializer):
    """Output result after executing an AI action."""
    success = serializers.BooleanField()
    message = serializers.CharField()
    data = serializers.DictField(required=False, allow_null=True, default=None)
'''

with open(serializers_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated serializers.py successfully")
