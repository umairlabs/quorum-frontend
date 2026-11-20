import os

def update_assets_views():
    path = r"C:\Users\HORIZON laptop\Desktop\api\apps\assets\views.py"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # AssetListCreateView
    if "class AssetListCreateView" in content and "required_permissions = {'GET': 'asset.view', 'POST': 'asset.create'}" not in content:
        content = content.replace(
            "class AssetListCreateView(APIView):\n    permission_classes = [IsAuthenticated]",
            "class AssetListCreateView(APIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permissions = {'GET': 'asset.view', 'POST': 'asset.create'}"
        )

    # AssetDetailView
    if "class AssetDetailView" in content and "required_permissions = {'GET': 'asset.view', 'PATCH': 'asset.edit', 'PUT': 'asset.edit', 'DELETE': 'asset.delete'}" not in content:
        content = content.replace(
            "class AssetDetailView(APIView):\n    permission_classes = [IsAuthenticated]",
            "class AssetDetailView(APIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permissions = {'GET': 'asset.view', 'PATCH': 'asset.edit', 'PUT': 'asset.edit', 'DELETE': 'asset.delete'}"
        )

    # AssetUnitAssignView
    if "class AssetUnitAssignView" in content and "required_permission = 'asset.assign'" not in content:
        content = content.replace(
            "class AssetUnitAssignView(APIView):\n    permission_classes = [IsAuthenticated]",
            "class AssetUnitAssignView(APIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permission = 'asset.assign'"
        )

    # AssetUnitReturnView
    if "class AssetUnitReturnView" in content and "required_permission = 'asset.return'" not in content:
        content = content.replace(
            "class AssetUnitReturnView(APIView):\n    permission_classes = [IsAuthenticated]",
            "class AssetUnitReturnView(APIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permission = 'asset.return'"
        )

    # AssignmentListCreateView
    if "class AssignmentListCreateView" in content and "required_permissions = {'GET': 'assignment.view', 'POST': 'asset.assign'}" not in content:
        content = content.replace(
            "class AssignmentListCreateView(APIView):\n    permission_classes = [IsAuthenticated]",
            "class AssignmentListCreateView(APIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permissions = {'GET': 'assignment.view', 'POST': 'asset.assign'}"
        )

    # AssignmentTransferView
    if "class AssignmentTransferView" in content and "required_permission = 'asset.transfer'" not in content:
        content = content.replace(
            "class AssignmentTransferView(APIView):\n    permission_classes = [IsAuthenticated]",
            "class AssignmentTransferView(APIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permission = 'asset.transfer'"
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated assets/views.py")

def update_purchases_views():
    path = r"C:\Users\HORIZON laptop\Desktop\api\apps\purchases\views.py"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if "from apps.authentication.permissions import RBACPermission" not in content:
        content = "from apps.authentication.permissions import RBACPermission\n" + content

    if "class PurchaseListCreateView" in content and "required_permissions = {'GET': 'purchase.view', 'POST': 'purchase.create'}" not in content:
        content = content.replace(
            "class PurchaseListCreateView(APIView):\n    permission_classes = [IsAuthenticated]",
            "class PurchaseListCreateView(APIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permissions = {'GET': 'purchase.view', 'POST': 'purchase.create'}"
        )

    if "class PurchaseDetailView" in content and "required_permissions = {'GET': 'purchase.view', 'PATCH': 'purchase.edit', 'PUT': 'purchase.edit', 'DELETE': 'purchase.delete'}" not in content:
        content = content.replace(
            "class PurchaseDetailView(APIView):\n    permission_classes = [IsAuthenticated]",
            "class PurchaseDetailView(APIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permissions = {'GET': 'purchase.view', 'PATCH': 'purchase.edit', 'PUT': 'purchase.edit', 'DELETE': 'purchase.delete'}"
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated purchases/views.py")

def update_maintenance_views():
    path = r"C:\Users\HORIZON laptop\Desktop\api\apps\maintenance\views.py"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if "from apps.authentication.permissions import RBACPermission" not in content:
        content = "from apps.authentication.permissions import RBACPermission\n" + content

    if "class MaintenanceListCreateView" in content and "required_permissions = {'GET': 'maintenance.view', 'POST': 'maintenance.create'}" not in content:
        content = content.replace(
            "class MaintenanceListCreateView(ListCreateAPIView):\n    permission_classes = [IsAuthenticated]",
            "class MaintenanceListCreateView(ListCreateAPIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permissions = {'GET': 'maintenance.view', 'POST': 'maintenance.create'}"
        )

    if "class MaintenanceDetailView" in content and "required_permissions = {'GET': 'maintenance.view', 'PATCH': 'maintenance.manage', 'PUT': 'maintenance.manage', 'DELETE': 'maintenance.manage'}" not in content:
        content = content.replace(
            "class MaintenanceDetailView(RetrieveUpdateDestroyAPIView):\n    permission_classes = [IsAuthenticated]",
            "class MaintenanceDetailView(RetrieveUpdateDestroyAPIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permissions = {'GET': 'maintenance.view', 'PATCH': 'maintenance.manage', 'PUT': 'maintenance.manage', 'DELETE': 'maintenance.manage'}"
        )

    if "class MaintenanceStatusUpdateView" in content and "required_permission = 'maintenance.status.update'" not in content:
        content = content.replace(
            "class MaintenanceStatusUpdateView(APIView):\n    permission_classes = [IsAuthenticated]",
            "class MaintenanceStatusUpdateView(APIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permission = 'maintenance.status.update'"
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated maintenance/views.py")

def update_depreciation_views():
    path = r"C:\Users\HORIZON laptop\Desktop\api\apps\depreciation\views.py"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if "from apps.authentication.permissions import RBACPermission" not in content:
        content = "from apps.authentication.permissions import RBACPermission\n" + content

    if "class DepreciationListAPIView" in content and "required_permission = 'depreciation.view'" not in content:
        content = content.replace(
            "class DepreciationListAPIView(APIView):\n    permission_classes = [IsAuthenticated]",
            "class DepreciationListAPIView(APIView):\n    permission_classes = [IsAuthenticated, RBACPermission]\n    required_permission = 'depreciation.view'"
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated depreciation/views.py")

if __name__ == "__main__":
    update_assets_views()
    update_purchases_views()
    update_maintenance_views()
    update_depreciation_views()
