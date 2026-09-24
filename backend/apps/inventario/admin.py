from django.contrib import admin

from .models import InventarioImportacion, InventarioItem, InventarioMovimiento, InventarioPendiente


@admin.register(InventarioItem)
class InventarioItemAdmin(admin.ModelAdmin):
    list_display = [
        'codigo_barras',
        'nombre',
        'seccion',
        'cantidad',
        'fuente',
        'folio_factura',
        'proveedor',
        'precio_unitario',
        'fecha_actualizacion',
    ]
    list_filter = ['seccion', 'fuente']
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


@admin.register(InventarioPendiente)
class InventarioPendienteAdmin(admin.ModelAdmin):
    list_display = ['folio', 'modelo', 'nombre', 'cantidad', 'cantidad_facturada', 'creado_en']
    list_filter = ['proveedor']
    search_fields = ['folio', 'modelo', 'nombre']
