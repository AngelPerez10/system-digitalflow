from django.contrib import admin

from .models import Cotizacion, CotizacionItem


admin.site.register(Cotizacion)
admin.site.register(CotizacionItem)
