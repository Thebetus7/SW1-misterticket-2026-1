from rest_framework import viewsets, permissions, status
from rest_framework.response import Response

from .models import Liquidacion
from .serializers import LiquidacionSerializer


class LiquidacionViewSet(viewsets.ModelViewSet):
    """
    CRUD de Liquidaciones.
    GET    /api/pagos/liquidaciones/         → Listar
    POST   /api/pagos/liquidaciones/         → Crear
    GET    /api/pagos/liquidaciones/{id}/    → Detalle
    PUT    /api/pagos/liquidaciones/{id}/    → Actualizar
    PATCH  /api/pagos/liquidaciones/{id}/    → Actualizar parcial (ej: estado, referencia_bancaria)
    DELETE /api/pagos/liquidaciones/{id}/    → Soft delete
    """
    queryset = Liquidacion.objects.select_related('evento').all()
    serializer_class = LiquidacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()  # Soft delete
        return Response(
            {'detail': 'Liquidación eliminada (soft delete).'},
            status=status.HTTP_200_OK
        )
