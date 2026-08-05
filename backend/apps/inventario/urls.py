from django.urls import path

from . import views

urlpatterns = [
    path('inventario/scan/', views.ScanView.as_view(), name='inventario-scan'),
    path('inventario/items/', views.InventarioItemListView.as_view(), name='inventario-items'),
    path(
        'inventario/items/<int:pk>/',
        views.InventarioItemDetailView.as_view(),
        name='inventario-item-detail',
    ),
    path(
        'inventario/movimientos/',
        views.InventarioMovimientoListView.as_view(),
        name='inventario-movimientos',
    ),
]
