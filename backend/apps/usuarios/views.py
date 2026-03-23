from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .serializers import UsuarioSerializer, CustomTokenObtainPairSerializer
from rest_framework.response import Response

Usuario = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Endpoint para Iniciar Sesión.
    Retorna el access_token, refresh_token y los datos del usuario logueado con sus roles.
    """
    serializer_class = CustomTokenObtainPairSerializer

class PerfilUsuarioView(generics.RetrieveAPIView):
    """
    Endpoint protegido para obtener el perfil actual.
    Require Token (Bearer Token).
    """
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
