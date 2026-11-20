import os

backend_dir = r"C:\Users\HORIZON laptop\Desktop\api"
purchases_dir = os.path.join(backend_dir, "apps", "purchases")

if os.path.exists(purchases_dir):
    for root, dirs, files in os.walk(purchases_dir):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if 'Notification' in content:
                        print("FOUND Notification in purchases:", filepath)
else:
    print("Purchases dir not found")
