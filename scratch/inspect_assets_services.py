import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def read_file(filepath, start=1, end=None):
    print("=" * 80)
    print(f"FILE: {filepath} (lines {start} to {end})")
    print("=" * 80)
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for i, line in enumerate(lines, 1):
                if i < start:
                    continue
                if end and i > end:
                    break
                print(f"{i:4d}: {line}", end='')
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

backend_dir = r"C:\Users\HORIZON laptop\Desktop\api"
read_file(os.path.join(backend_dir, "apps", "assets", "services.py"), start=820, end=910)
