from django.contrib import admin

from .models import Notificacion, PushDevice


@admin.register(PushDevice)
class PushDeviceAdmin(admin.ModelAdmin):
    list_display = ('user', 'platform', 'created_at', 'last_seen_at', 'disabled_at')
    list_filter = ('platform', 'disabled_at')
    search_fields = ('user__username', 'user__email', 'expo_token')
    readonly_fields = ('created_at', 'last_seen_at')
    raw_id_fields = ('user',)


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ('destinatario', 'tipo', 'titulo', 'leida_at', 'created_at')
    list_filter = ('tipo', 'leida_at')
    search_fields = ('destinatario__username', 'destinatario__email', 'titulo', 'cuerpo', 'clave_dedupe')
    readonly_fields = ('created_at',)
    raw_id_fields = ('destinatario',)
    date_hierarchy = 'created_at'
