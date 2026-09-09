from django.contrib import admin

from .models import PushDevice


@admin.register(PushDevice)
class PushDeviceAdmin(admin.ModelAdmin):
    list_display = ('user', 'platform', 'created_at', 'last_seen_at', 'disabled_at')
    list_filter = ('platform', 'disabled_at')
    search_fields = ('user__username', 'user__email', 'expo_token')
    readonly_fields = ('created_at', 'last_seen_at')
    raw_id_fields = ('user',)
