from rest_framework import viewsets, permissions

from ..models import Ticket
from ..serializers import TicketSerializer
from .mixins import SoftDeleteMixin


class TicketViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/tickets/tickets/         → Listar (filtrable por ?factura=<id> o ?zona=<id>)
    POST   /api/tickets/tickets/         → Crear
    GET    /api/tickets/tickets/{id}/    → Detalle
    PUT    /api/tickets/tickets/{id}/    → Actualizar
    PATCH  /api/tickets/tickets/{id}/    → Actualizar parcial (ej: estado)
    DELETE /api/tickets/tickets/{id}/    → Soft delete
    """
    queryset = Ticket.objects.select_related('zona', 'factura', 'asiento').all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        factura_id = self.request.query_params.get('factura')
        zona_id = self.request.query_params.get('zona')
        if factura_id:
            qs = qs.filter(factura_id=factura_id)
        if zona_id:
            qs = qs.filter(zona_id=zona_id)
        return qs
