from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from core.mixins import SoftDeleteMixin
from ..models import Artista, Promotor, Verificador, Vendedor, SeguidorPromotor
from ..serializers import ArtistaSerializer, PromotorSerializer, VerificadorSerializer, VendedorSerializer, VendedorCrearSerializer


class ArtistaViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    CRUD completo de Artistas. Soporta subida de foto via multipart/form-data.
    GET    /api/artistas/          → Listar
    POST   /api/artistas/          → Crear (foto via form-data)
    GET    /api/artistas/{id}/     → Detalle
    PUT    /api/artistas/{id}/     → Actualizar
    PATCH  /api/artistas/{id}/     → Actualizar parcial
    DELETE /api/artistas/{id}/     → Soft delete
    """
    queryset = Artista.objects.all()
    serializer_class = ArtistaSerializer
    permission_classes = [permissions.IsAuthenticated]


class PromotorViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    CRUD completo de Promotores.
    GET    /api/promotores/          → Listar
    POST   /api/promotores/          → Crear
    GET    /api/promotores/{id}/     → Detalle
    PUT    /api/promotores/{id}/     → Actualizar
    PATCH  /api/promotores/{id}/     → Actualizar parcial
    DELETE /api/promotores/{id}/     → Soft delete
    """
    queryset = Promotor.objects.all()
    serializer_class = PromotorSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='seguir')
    def seguir(self, request, pk=None):
        """
        POST /api/usuarios/promotores/{id}/seguir/
        Alterna (toggle) el seguimiento del promotor especificado por id.
        """
        promotor = self.get_object()
        usuario = request.user
        
        # Comprobar si ya lo sigue
        seguimiento = SeguidorPromotor.objects.filter(usuario=usuario, promotor=promotor)
        if seguimiento.exists():
            seguimiento.delete()
            siguiendo = False
        else:
            SeguidorPromotor.objects.create(usuario=usuario, promotor=promotor)
            siguiendo = True
            
        return Response({'siguiendo': siguiendo}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='siguiendo')
    def siguiendo(self, request):
        """
        GET /api/usuarios/promotores/siguiendo/
        Devuelve la lista de IDs de promotores que el usuario autenticado sigue.
        """
        ids = list(SeguidorPromotor.objects.filter(usuario=request.user).values_list('promotor_id', flat=True))
        return Response({'promotores_seguidos': ids}, status=status.HTTP_200_OK)


class VerificadorViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    CRUD completo de Verificadores.
    GET    /api/verificadores/          → Listar
    POST   /api/verificadores/          → Crear
    GET    /api/verificadores/{id}/     → Detalle
    PUT    /api/verificadores/{id}/     → Actualizar
    PATCH  /api/verificadores/{id}/     → Actualizar parcial
    DELETE /api/verificadores/{id}/     → Soft delete
    """
    queryset = Verificador.objects.all()
    serializer_class = VerificadorSerializer
    permission_classes = [permissions.IsAuthenticated]


class VendedorViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de Vendedores.
    GET    /api/vendedores/          → Listar
    POST   /api/vendedores/          → Crear
    GET    /api/vendedores/{id}/     → Detalle
    PUT    /api/vendedores/{id}/     → Actualizar
    PATCH  /api/vendedores/{id}/     → Actualizar parcial
    DELETE /api/vendedores/{id}/     → Soft delete
    """
    queryset = Vendedor.objects.select_related('usuario', 'promotor').all()
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        if hasattr(user, 'perfil_promotor'):
            return qs.filter(promotor=user.perfil_promotor)
        # Si no es admin ni promotor, no ve nada o ve vacío
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return VendedorCrearSerializer
        return VendedorSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Soft delete de la cuenta de usuario asociada
        if instance.usuario:
            instance.usuario.delete()
        instance.delete()
        return Response(
            {'detail': 'Vendedor eliminado correctamente (soft delete).'},
            status=status.HTTP_200_OK
        )

