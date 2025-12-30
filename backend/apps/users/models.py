from django.conf import settings
from django.db import models


class UserPermissions(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='permissions_profile',
    )
    permissions = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Permisos de {self.user}"
