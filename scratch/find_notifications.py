import os
import re

backend_dir = r"C:\Users\HORIZON laptop\Desktop\api"

print("Searching for notification creations in backend...")

pattern = re.compile(r'Notification\.(objects|NotificationType)', re.IGNORECASE)

for root, dirs, files in os.walk(backend_dir):
    if 'venv' in root or '__pycache__' in root:
        continue
    for file in files: 
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if 'Notification' in content:
                    lines = content.splitlines()
                    for idx, line in enumerate(lines, 1):
                        if 'Notification.objects.create' in line or 'bulk_create' in line or 'sub_type' in line or 'NotificationType' in line:
                            rel_path = os.path.relpath(filepath, backend_dir)
                            print(f"{rel_path}:{idx}: {line.strip()}")
