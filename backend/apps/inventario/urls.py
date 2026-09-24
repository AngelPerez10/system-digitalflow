from django.urls import path

from . import views

urlpatterns = [
    path('inventario/scan/', views.ScanView.as_view(), name='inventario-scan'),
    path('inventario/items/', views.InventarioItemListView.as_view(), name='inventario-items'),
    path('inventario/stats/', views.InventarioStatsView.as_view(), name='inventario-stats'),
    path(
        'inventario/sincronizar-secciones/',
        views.InventarioSincronizarSeccionesView.as_view(),
        name='inventario-sincronizar-secciones',
    ),
    path(
        'inventario/items/<int:pk>/',
        views.InventarioItemDetailView.as_view(),
        name='inventario-item-detail',
    ),
    path(
        'inventario/upload-image/',
        views.InventarioUploadImageView.as_view(),
        name='inventario-upload-image',
    ),
    path(
        'inventario/catalogo/',
        views.InventarioCatalogoSearchView.as_view(),
        name='inventario-catalogo',
    ),
    path(
        'inventario/registrar-catalogo/',
        views.InventarioRegistrarCatalogoView.as_view(),
        name='inventario-registrar-catalogo',
    ),
    path(
        'inventario/catalogo/detalle/',
        views.InventarioCatalogoDetallePorRefView.as_view(),
        name='inventario-catalogo-detalle',
    ),
    path(
        'inventario/importar-factura/previsualizar/',
        views.InventarioPrevisualizarFacturaView.as_view(),
        name='inventario-importar-factura-previsualizar',
    ),
    path(
        'inventario/pendientes/',
        views.InventarioPendienteListView.as_view(),
        name='inventario-pendientes',
    ),
    path(
        'inventario/pendientes/<int:pk>/',
        views.InventarioPendienteDetailView.as_view(),
        name='inventario-pendiente-detail',
    ),
    path(
        'inventario/pendientes/<int:pk>/recibir/',
        views.InventarioRecibirPendienteView.as_view(),
        name='inventario-pendiente-recibir',
    ),
    path(
        'inventario/importar-factura/',
        views.InventarioImportarFacturaView.as_view(),
        name='inventario-importar-factura',
    ),
    path(
        'inventario/movimientos/',
        views.InventarioMovimientoListView.as_view(),
        name='inventario-movimientos',
    ),
]
