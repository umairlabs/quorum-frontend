path = r"C:\Users\HORIZON laptop\Desktop\api\apps\audit\models.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

if "USER_PERMISSIONS_UPDATED" not in content:
    content = content.replace(
        "ASSET_SCRAPPED = 'ASSET_SCRAPPED', 'Asset Scrapped'",
        "ASSET_SCRAPPED = 'ASSET_SCRAPPED', 'Asset Scrapped'\n        USER_PERMISSIONS_UPDATED = 'USER_PERMISSIONS_UPDATED', 'User Permissions Updated'"
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully updated audit/models.py")
else:
    print("USER_PERMISSIONS_UPDATED already in audit/models.py")
