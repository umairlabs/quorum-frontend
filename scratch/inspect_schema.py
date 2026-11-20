import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

backend_dir = r"C:\Users\HORIZON laptop\Desktop\api"

def print_model_fields(model_file):
    print("="*80)
    print("FILE:", model_file)
    print("="*80)
    with open(model_file, 'r', encoding='utf-8') as f:
        print(f.read())

print_model_fields(os.path.join(backend_dir, "apps", "assets", "models.py"))
print_model_fields(os.path.join(backend_dir, "apps", "maintenance", "models.py"))
