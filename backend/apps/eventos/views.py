from rest_framework import viewsets, permissions, status
from rest_framework.response import Response

from .models import (
    Departamento, Lugar, GeneroMusical, Evento,
    Zona, Asiento, PresentacionEvento, VerificadorEvento, RegistroAcceso,
)
from .serializers import (
    DepartamentoSerializer, LugarSerializer, GeneroMusicalSerializer,
    EventoSerializer, ZonaSerializer, AsientoSerializer,
    PresentacionEventoSerializer, VerificadorEventoSerializer,
    RegistroAccesoSerializer,
)


# Mixin reutilizable para el soft delete personalizado
class SoftDeleteMixin:
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()  # Soft delete del modelo base
        return Response(
            {'detail': f'{instance.__class__.__name__} eliminado (soft delete).'},
            status=status.HTTP_200_OK
        )


# =============================================================================
# CRUD: Departamento
# =============================================================================
class DepartamentoViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/eventos/departamentos/         → Listar
    POST   /api/eventos/departamentos/         → Crear
    GET    /api/eventos/departamentos/{id}/    → Detalle
    PUT    /api/eventos/departamentos/{id}/    → Actualizar
    PATCH  /api/eventos/departamentos/{id}/    → Actualizar parcial
    DELETE /api/eventos/departamentos/{id}/    → Soft delete
    """
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer
    permission_classes = [permissions.IsAuthenticated]


# =============================================================================
# CRUD: Lugar
# =============================================================================
class LugarViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/eventos/lugares/         → Listar
    POST   /api/eventos/lugares/         → Crear
    GET    /api/eventos/lugares/{id}/    → Detalle
    PUT    /api/eventos/lugares/{id}/    → Actualizar
    PATCH  /api/eventos/lugares/{id}/    → Actualizar parcial
    DELETE /api/eventos/lugares/{id}/    → Soft delete
    """
    queryset = Lugar.objects.all()
    serializer_class = LugarSerializer
    permission_classes = [permissions.IsAuthenticated]


# =============================================================================
# CRUD: GeneroMusical
# =============================================================================
class GeneroMusicalViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/eventos/generos/         → Listar
    POST   /api/eventos/generos/         → Crear
    GET    /api/eventos/generos/{id}/    → Detalle
    PUT    /api/eventos/generos/{id}/    → Actualizar
    PATCH  /api/eventos/generos/{id}/    → Actualizar parcial
    DELETE /api/eventos/generos/{id}/    → Soft delete
    """
    queryset = GeneroMusical.objects.all()
    serializer_class = GeneroMusicalSerializer
    permission_classes = [permissions.IsAuthenticated]


# =============================================================================
# CRUD: Evento
# =============================================================================
class EventoViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/eventos/eventos/         → Listar
    POST   /api/eventos/eventos/         → Crear
    GET    /api/eventos/eventos/{id}/    → Detalle (incluye zonas anidadas)
    PUT    /api/eventos/eventos/{id}/    → Actualizar
    PATCH  /api/eventos/eventos/{id}/    → Actualizar parcial
    DELETE /api/eventos/eventos/{id}/    → Soft delete
    """
    queryset = Evento.objects.select_related('lugar', 'organizador').prefetch_related('zonas')
    serializer_class = EventoSerializer
    permission_classes = [permissions.IsAuthenticated]


# =============================================================================
# CRUD: Zona
# =============================================================================
class ZonaViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/eventos/zonas/         → Listar (filtrable por ?evento=<id>)
    POST   /api/eventos/zonas/         → Crear
    GET    /api/eventos/zonas/{id}/    → Detalle
    PUT    /api/eventos/zonas/{id}/    → Actualizar
    PATCH  /api/eventos/zonas/{id}/    → Actualizar parcial
    DELETE /api/eventos/zonas/{id}/    → Soft delete
    """
    queryset = Zona.objects.all()
    serializer_class = ZonaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get('evento')
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        return qs


# =============================================================================
# CRUD: Asiento
# =============================================================================
class AsientoViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/eventos/asientos/         → Listar (filtrable por ?zona=<id>)
    POST   /api/eventos/asientos/         → Crear
    GET    /api/eventos/asientos/{id}/    → Detalle
    PUT    /api/eventos/asientos/{id}/    → Actualizar
    PATCH  /api/eventos/asientos/{id}/    → Actualizar parcial
    DELETE /api/eventos/asientos/{id}/    → Soft delete
    """
    queryset = Asiento.objects.all()
    serializer_class = AsientoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        zona_id = self.request.query_params.get('zona')
        if zona_id:
            qs = qs.filter(zona_id=zona_id)
        return qs


# =============================================================================
# CRUD: PresentacionEvento
# =============================================================================
class PresentacionEventoViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/eventos/presentaciones/         → Listar (filtrable por ?evento=<id>)
    POST   /api/eventos/presentaciones/         → Crear
    GET    /api/eventos/presentaciones/{id}/    → Detalle
    PUT    /api/eventos/presentaciones/{id}/    → Actualizar
    PATCH  /api/eventos/presentaciones/{id}/    → Actualizar parcial
    DELETE /api/eventos/presentaciones/{id}/    → Soft delete
    """
    queryset = PresentacionEvento.objects.select_related('evento', 'artista').all()
    serializer_class = PresentacionEventoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        evento_id = self.request.query_params.get('evento')
        if evento_id:
            qs = qs.filter(evento_id=evento_id)
        return qs


# =============================================================================
# CRUD: VerificadorEvento
# =============================================================================
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


# =============================================================================
# CRUD: RegistroAcceso
# =============================================================================
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
