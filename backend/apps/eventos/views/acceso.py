from rest_framework import viewsets, permissions

from ..models import VerificadorEvento, RegistroAcceso
from ..serializers import VerificadorEventoSerializer, RegistroAccesoSerializer
from .mixins import SoftDeleteMixin


class VerificadorEventoViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/eventos/verificadores-evento/         → Listar
    POST   /api/eventos/verificadores-evento/         → Asignar verificador a evento
    GET    /api/eventos/verificadores-evento/{id}/    → Detalle
    DELETE /api/eventos/verificadores-evento/{id}/    → Eliminar asignación
    """
    queryset = VerificadorEvento.objects.select_related('evento', 'verificador').all()
    serializer_class = VerificadorEventoSerializer
    permission_classes = [permissions.IsAuthenticated]


class RegistroAccesoViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/eventos/registros-acceso/         → Listar (filtrable por ?ticket=<id>)
    POST   /api/eventos/registros-acceso/         → Registrar un acceso
    GET    /api/eventos/registros-acceso/{id}/    → Detalle
    """
    queryset = RegistroAcceso.objects.all()
    serializer_class = RegistroAccesoSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']  # Solo lectura + creación

    def get_queryset(self):
        qs = super().get_queryset()
        ticket_id = self.request.query_params.get('ticket')
        if ticket_id:
            qs = qs.filter(ticket_id=ticket_id)
        return qs
