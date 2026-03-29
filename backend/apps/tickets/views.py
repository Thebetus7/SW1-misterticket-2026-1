from rest_framework import viewsets, permissions, status
from rest_framework.response import Response

from .models import Factura, Ticket
from .serializers import FacturaSerializer, TicketSerializer


class SoftDeleteMixin:
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {'detail': f'{instance.__class__.__name__} eliminado (soft delete).'},
            status=status.HTTP_200_OK
        )


# =============================================================================
# CRUD: Factura
# =============================================================================
class FacturaViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/tickets/facturas/         → Listar (filtrable por ?cliente=<id>)
    POST   /api/tickets/facturas/         → Crear
    GET    /api/tickets/facturas/{id}/    → Detalle
    PUT    /api/tickets/facturas/{id}/    → Actualizar
    PATCH  /api/tickets/facturas/{id}/    → Actualizar parcial (ej: estado_pago)
    DELETE /api/tickets/facturas/{id}/    → Soft delete
    """
    queryset = Factura.objects.select_related('cliente').all()
    serializer_class = FacturaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        # El usuario solo ve sus propias facturas a menos que sea admin
        if not self.request.user.is_staff:
            qs = qs.filter(cliente=self.request.user)
        return qs


# =============================================================================
# CRUD: Ticket
# =============================================================================
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
