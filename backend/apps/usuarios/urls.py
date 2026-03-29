from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, RegistroView, PerfilView,
    PersonaViewSet, UsuarioViewSet,
    ArtistaViewSet, OrganizadorViewSet, VerificadorViewSet,
)

# Router genera automáticamente todas las rutas CRUD
router = DefaultRouter()
router.register(r'lista', UsuarioViewSet, basename='usuario')
router.register(r'personas', PersonaViewSet, basename='persona')
router.register(r'artistas', ArtistaViewSet, basename='artista')
router.register(r'organizadores', OrganizadorViewSet, basename='organizador')
router.register(r'verificadores', VerificadorViewSet, basename='verificador')

urlpatterns = [
    # Auth
    path('login/', LoginView.as_view(), name='login'),
    path('registro/', RegistroView.as_view(), name='registro'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('perfil/', PerfilView.as_view(), name='perfil'),

    # CRUD via Router
    path('', include(router.urls)),
]
