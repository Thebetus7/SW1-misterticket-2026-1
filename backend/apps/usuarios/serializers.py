from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

Usuario = get_user_model()

class UsuarioSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'telefono', 'roles')
        
    def get_roles(self, obj):
        return obj.get_roles()

# Custom Serializer para el Login, para devolver los datos del usuario junto con el token
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Añadimos datos del usurio al payload de respuesta (no al token JWT en si)
        usuario_serializer = UsuarioSerializer(self.user)
        data['usuario'] = usuario_serializer.data
        return data
