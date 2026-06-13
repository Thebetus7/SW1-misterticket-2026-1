from rest_framework import viewsets, permissions, status
from rest_framework.response import Response

from ..models import Artista, Organizador, Verificador
from ..serializers import ArtistaSerializer, OrganizadorSerializer, VerificadorSerializer


class ArtistaViewSet(viewsets.ModelViewSet):
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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {'detail': 'Artista eliminado correctamente (soft delete).'},
            status=status.HTTP_200_OK
        )


class OrganizadorViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de Organizadores.
    GET    /api/organizadores/          → Listar
    POST   /api/organizadores/          → Crear
    GET    /api/organizadores/{id}/     → Detalle
    PUT    /api/organizadores/{id}/     → Actualizar
    PATCH  /api/organizadores/{id}/     → Actualizar parcial
    DELETE /api/organizadores/{id}/     → Soft delete
    """
    queryset = Organizador.objects.all()
    serializer_class = OrganizadorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {'detail': 'Organizador eliminado correctamente (soft delete).'},
            status=status.HTTP_200_OK
        )


class VerificadorViewSet(viewsets.ModelViewSet):
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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {'detail': 'Verificador eliminado correctamente (soft delete).'},
            status=status.HTTP_200_OK
        )
