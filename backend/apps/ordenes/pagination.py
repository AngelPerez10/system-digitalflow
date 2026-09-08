from rest_framework.pagination import PageNumberPagination


class OrdenOptInPagination(PageNumberPagination):
    """Paginación **opt-in** para el listado de órdenes.

    `/api/ordenes/` históricamente devuelve un array plano con *todas* las
    órdenes del filtro (el frontend y la app Expo hacen `data.map(...)`
    directamente). Cambiar eso a un sobre `{count, next, previous, results}` de
    golpe rompería a todos los clientes a la vez.

    Con esta clase el comportamiento por defecto no cambia: si la petición no
    trae `page` ni `page_size`, `paginate_queryset` devuelve `None` y la vista
    responde el array plano de siempre. En cuanto un cliente añade `?page=1`
    (o `?page_size=N`) recibe el sobre paginado y puede pedir la siguiente
    página con el `next`. Así los clientes migran uno a uno sin coordinación.

    `page_size` 50 cubre de sobra un mes de órdenes en una pantalla; `max` 200
    acota el coste de una página aunque el cliente pida más.
    """

    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

    def paginate_queryset(self, queryset, request, view=None):
        params = request.query_params
        if self.page_query_param not in params and self.page_size_query_param not in params:
            return None
        return super().paginate_queryset(queryset, request, view=view)
