import os

backend_dir = r"C:\Users\HORIZON laptop\Desktop\api"

signals_py_content = '''from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification
from apps.users.models import User

@receiver(post_save, sender=Notification)
def notification_post_save_push(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        from .services import send_push_notification
        data = {
            'notification_id': str(instance.id),
            'type': str(instance.type or ''),
            'sub_type': str(instance.sub_type or ''),
            'related_request_id': str(instance.related_request_id or ''),
            'related_request_number': str(instance.related_request_number or ''),
        }
        if instance.user:
            send_push_notification(
                user=instance.user,
                title=instance.title,
                body=instance.message,
                data=data
            )
        elif instance.target_role:
            role_users = User.objects.filter(role__iexact=instance.target_role)
            for role_user in role_users:
                send_push_notification(
                    user=role_user,
                    title=instance.title,
                    body=instance.message,
                    data=data
                )
    except Exception as e:
        print(f"[PushNotificationSignal] Error sending push notification: {e}")
'''

apps_py_content = '''from django.apps import AppConfig

class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notifications'

    def ready(self):
        import apps.notifications.signals  # noqa
'''

signals_path = os.path.join(backend_dir, "apps", "notifications", "signals.py")
apps_path = os.path.join(backend_dir, "apps", "notifications", "apps.py")

with open(signals_path, 'w', encoding='utf-8') as f:
    f.write(signals_py_content)
print("Updated signals.py")

with open(apps_path, 'w', encoding='utf-8') as f:
    f.write(apps_py_content)
print("Updated apps.py")
