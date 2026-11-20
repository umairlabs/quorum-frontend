import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

backend_dir = r"C:\Users\HORIZON laptop\Desktop\api"
apps_py = os.path.join(backend_dir, "apps", "notifications", "apps.py")
models_py = os.path.join(backend_dir, "apps", "notifications", "models.py")

print("--- APPS.PY ---")
with open(apps_py, 'r', encoding='utf-8') as f:
    print(f.read())

print("--- MODELS.PY TAIL ---")
with open(models_py, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    print("".join(lines[-30:]))
