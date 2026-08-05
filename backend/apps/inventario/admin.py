from django.contrib import admin

from .models import InventarioItem, InventarioMovimiento


@admin.register(InventarioItem)
class InventarioItemAdmin(admin.ModelAdmin):
    list_display = ['codigo_barras', 'nombre', 'cantidad', 'fuente', 'fecha_actualizacion']
    search_fields = ['codigo_barras', 'nombre', 'marca', 'modelo']


@admin.register(InventarioMovimiento)
class InventarioMovimientoAdmin(admin.ModelAdmin):
    list_display = ['item', 'tipo', 'cantidad', 'usuario', 'creado_en']
    list_filter = ['tipo', 'creado_en']
