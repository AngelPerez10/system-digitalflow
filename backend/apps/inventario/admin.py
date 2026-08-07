from django.contrib import admin

from .models import InventarioImportacion, InventarioItem, InventarioMovimiento


@admin.register(InventarioItem)
class InventarioItemAdmin(admin.ModelAdmin):
    list_display = [
        'codigo_barras',
        'nombre',
        'cantidad',
        'fuente',
        'folio_factura',
        'proveedor',
        'precio_unitario',
        'fecha_actualizacion',
    ]
    search_fields = ['codigo_barras', 'nombre', 'marca', 'modelo']


@admin.register(InventarioMovimiento)
class InventarioMovimientoAdmin(admin.ModelAdmin):
    list_display = ['item', 'tipo', 'cantidad', 'usuario', 'creado_en']
    list_filter = ['tipo', 'creado_en']


@admin.register(InventarioImportacion)
class InventarioImportacionAdmin(admin.ModelAdmin):
    list_display = ['proveedor', 'folio', 'usuario', 'creado_en']
    list_filter = ['proveedor', 'creado_en']
    search_fields = ['folio']
