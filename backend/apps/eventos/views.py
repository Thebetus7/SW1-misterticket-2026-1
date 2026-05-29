from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
import math
from django.db import transaction

from .models import (
    Departamento, Lugar, GeneroMusical, Evento,
    Zona, Asiento, PresentacionEvento, VerificadorEvento, RegistroAcceso,
)
from .serializers import (
    DepartamentoSerializer, LugarSerializer, GeneroMusicalSerializer,
    EventoSerializer, ZonaSerializer, AsientoSerializer,
    PresentacionEventoSerializer, VerificadorEventoSerializer,
    RegistroAccesoSerializer, EventoCrearSerializer, ZonaCrearSerializer
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

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        
        # Filtro por organizador logueado
        if hasattr(user, 'perfil_organizador'):
            qs = qs.filter(organizador=user.perfil_organizador)
            
        # Filtros por fecha
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_desde:
            qs = qs.filter(fecha_inicio__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha_inicio__date__lte=fecha_hasta)
            
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return EventoCrearSerializer
        return EventoSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = self.request.user
        organizador = user.perfil_organizador if hasattr(user, 'perfil_organizador') else None

        evento = Evento.objects.create(
            nombre=serializer.validated_data['nombre'],
            estado=serializer.validated_data['estado'],
            lugar=serializer.validated_data['lugar'],
            fecha_inicio=serializer.validated_data['fecha_inicio'],
            fecha_fin=serializer.validated_data['fecha_fin'],
            organizador=organizador
        )

        zonas_data = serializer.validated_data['zonas']
        self._crear_zonas_y_asientos(evento, zonas_data)

        headers = self.get_success_headers(serializer.data)
        return Response(EventoSerializer(evento).data, status=status.HTTP_201_CREATED, headers=headers)

    def _crear_zonas_y_asientos(self, evento, zonas_data):
        for zona_data in zonas_data:
            cantidad_asientos = zona_data['cantidad_asientos']
            zona = Zona.objects.create(
                evento=evento,
                nombre=zona_data['nombre'],
                precio=zona_data['precio'],
                capacidad_max=cantidad_asientos,
                entradas_disponibles=cantidad_asientos,
                es_numerada=True # En este proyecto universitario forzamos a true para crear los asientos fisicos en bd
            )

            # Generar asientos
            # Calculamos columnas para layout cuadrado aproximado
            cols = math.ceil(math.sqrt(cantidad_asientos))
            
            asientos_a_crear = []
            asientos_creados = 0
            fila = 1
            
            while asientos_creados < cantidad_asientos:
                for col in range(1, cols + 1):
                    if asientos_creados >= cantidad_asientos:
                        break
                    asientos_a_crear.append(Asiento(
                        zona=zona,
                        fila=str(fila),
                        columna=str(col),
                        estado='desocupado'
                    ))
                    asientos_creados += 1
                fila += 1
                
            Asiento.objects.bulk_create(asientos_a_crear)

    @action(detail=True, methods=['delete'], url_path='eliminar_zona/(?P<zona_id>[^/.]+)')
    def eliminar_zona(self, request, pk=None, zona_id=None):
        evento = self.get_object()
        try:
            zona = Zona.objects.get(id=zona_id, evento=evento)
            # Esto hará un soft delete si Zona tiene soft delete, 
            # de lo contrario hard delete. En Django cascade actua igual.
            zona.delete() 
            return Response({'detail': 'Zona y sus asientos eliminados correctamente.'}, status=status.HTTP_200_OK)
        except Zona.DoesNotExist:
            return Response({'detail': 'La zona no existe en este evento.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='agregar_zona')
    @transaction.atomic
    def agregar_zona(self, request, pk=None):
        evento = self.get_object()
        serializer = ZonaCrearSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        lugar_capacidad = evento.lugar.capacidad_total
        # Calcular asientos actuales (solo zonas activas)
        asientos_actuales = sum(z.capacidad_max for z in evento.zonas.all())
        cantidad_nueva = serializer.validated_data['cantidad_asientos']
        
        if asientos_actuales + cantidad_nueva > lugar_capacidad:
            return Response(
                {"detail": f"Capacidad excedida. Quedan {lugar_capacidad - asientos_actuales} asientos disponibles."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        self._crear_zonas_y_asientos(evento, [serializer.validated_data])
        
        return Response({'detail': 'Zona y asientos agregados correctamente.'}, status=status.HTTP_201_CREATED)


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
