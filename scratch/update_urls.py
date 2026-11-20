import os

urls_path = r"C:\Users\HORIZON laptop\Desktop\api\apps\ai\urls.py"

content = '''from django.urls import path
from .views import GenerateMaintenanceIssueView, AIChatView, AIExecuteActionView

app_name = 'ai'

urlpatterns = [
    path('generate-maintenance-issue/', GenerateMaintenanceIssueView.as_view(), name='generate-maintenance-issue'),
    path('chat/', AIChatView.as_view(), name='ai-chat'),
    path('execute-action/', AIExecuteActionView.as_view(), name='ai-execute-action'),
]
'''

with open(urls_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated urls.py successfully")
