from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model

from .models import Persona, Artista, Organizador, Verificador
from .serializers import (
    PersonaSerializer, UsuarioSerializer, UsuarioRegistroSerializer,
    ArtistaSerializer, OrganizadorSerializer, VerificadorSerializer,
    CustomTokenObtainPairSerializer,
)

Usuario = get_user_model()


# =============================================================================
# AUTH VIEWS
# =============================================================================
class LoginView(TokenObtainPairView):
    """
    POST /api/usuarios/login/
    Retorna access_token, refresh_token y datos del usuario con sus roles.
    """
    serializer_class = CustomTokenObtainPairSerializer


class RegistroView(generics.CreateAPIView):
    """
    POST /api/usuarios/registro/
    Crea un nuevo usuario. No requiere autenticación.
    Acepta: username, email, password, first_name, last_name, rol_nombre
    """
    queryset = Usuario.objects.all()
    serializer_class = UsuarioRegistroSerializer
    permission_classes = [permissions.AllowAny]


class PerfilView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/usuarios/perfil/  → Ver mi perfil
    PUT  /api/usuarios/perfil/  → Actualizar mi perfil
    PATCH /api/usuarios/perfil/ → Actualizar parcial
    """
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# =============================================================================
# CRUD: Persona
# =============================================================================
class PersonaViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de Personas.
    GET    /api/personas/          → Listar todas
    POST   /api/personas/          → Crear
    GET    /api/personas/{id}/     → Detalle
    PUT    /api/personas/{id}/     → Actualizar completo
    PATCH  /api/personas/{id}/     → Actualizar parcial
    DELETE /api/personas/{id}/     → Soft delete
    """
    queryset = Persona.objects.all()
    serializer_class = PersonaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        """Sobrescribimos destroy para hacer soft delete en lugar de eliminar."""
        instance = self.get_object()
        instance.delete()  # Llama al soft delete del modelo
        return Response(
            {'detail': 'Persona eliminada correctamente (soft delete).'},
            status=status.HTTP_200_OK
        )


# =============================================================================
# CRUD: Usuario
# =============================================================================
class UsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de Usuarios.
    GET    /api/usuarios/usuarios/       → Listar todos
    POST   /api/usuarios/usuarios/       → Crear (usa serializer de registro)
    GET    /api/usuarios/usuarios/{id}/  → Detalle
    PUT    /api/usuarios/usuarios/{id}/  → Actualizar
    PATCH  /api/usuarios/usuarios/{id}/  → Actualizar parcial
    DELETE /api/usuarios/usuarios/{id}/  → Soft delete
    GET    /api/usuarios/usuarios/{id}/roles/ → Ver roles del usuario
    """
    queryset = Usuario.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        """Usa serializer de registro para crear y de lectura para el resto."""
        if self.action == 'create':
            return UsuarioRegistroSerializer
        return UsuarioSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()  # Soft delete
        return Response(
            {'detail': 'Usuario eliminado correctamente (soft delete).'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'], url_path='roles')
    def roles(self, request, pk=None):
        """GET /api/usuarios/usuarios/{id}/roles/ → Lista los roles del usuario."""
        usuario = self.get_object()
        return Response({'roles': usuario.get_roles()})

    @action(detail=True, methods=['post'], url_path='asignar-rol')
    def asignar_rol(self, request, pk=None):
        """
        POST /api/usuarios/usuarios/{id}/asignar-rol/
        Body: {"rol": "organizador"}
        Asigna un rol al usuario.
        """
        from django.contrib.auth.models import Group
        usuario = self.get_object()
        rol_nombre = request.data.get('rol')
        if not rol_nombre:
            return Response({'error': 'El campo "rol" es requerido.'}, status=400)
        try:
            grupo = Group.objects.get(name=rol_nombre)
            usuario.groups.add(grupo)
            return Response({'detail': f'Rol "{rol_nombre}" asignado correctamente.'})
        except Group.DoesNotExist:
            return Response({'error': f'El rol "{rol_nombre}" no existe.'}, status=404)


# =============================================================================
# CRUD: Artista
# =============================================================================
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


# =============================================================================
# CRUD: Organizador
# =============================================================================
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


# =============================================================================
# CRUD: Verificador
# =============================================================================
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
