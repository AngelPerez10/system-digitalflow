from django.contrib import admin
from .models import Tarea


@admin.register(Tarea)
class TareaAdmin(admin.ModelAdmin):
    list_display = ['id', 'estado', 'orden', 'usuario_asignado', 'fecha_creacion', 'creado_por']
    list_filter = ['estado', 'fecha_creacion']
    search_fields = ['descripcion', 'usuario_asignado__username']
    readonly_fields = ['fecha_creacion', 'fecha_actualizacion']
