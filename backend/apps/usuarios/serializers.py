from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from .models import Persona, Artista, Organizador, Verificador

Usuario = get_user_model()


# =============================================================================
# SERIALIZER: Persona
# =============================================================================
class PersonaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Persona
        fields = ('id', 'nombre', 'ci', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


# =============================================================================
# SERIALIZER: Usuario (lectura — sin password)
# =============================================================================
class UsuarioSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    persona = PersonaSerializer(read_only=True)

    class Meta:
        model = Usuario
        fields = (
            'id', 'username', 'email',
            'first_name', 'last_name',
            'persona', 'roles',
            'is_active', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'roles')

    def get_roles(self, obj):
        return obj.get_roles()


# =============================================================================
# SERIALIZER: Registro de nuevo usuario
# =============================================================================
class UsuarioRegistroSerializer(serializers.ModelSerializer):
    """
    Serializer para crear usuarios nuevos.
    Acepta password en texto plano y lo hashea automáticamente.
    Se puede pasar rol_nombre para asignarlo al usuario (ej: 'organizador').
    """
    password = serializers.CharField(write_only=True, min_length=6)
    rol_nombre = serializers.ChoiceField(
        choices=['organizador', 'verificador', 'artista'],
        write_only=True, required=False, allow_blank=True, allow_null=True
    )

    class Meta:
        model = Usuario
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'rol_nombre')
        read_only_fields = ('id',)

    def create(self, validated_data):
        rol_nombre = validated_data.pop('rol_nombre', None)
        password = validated_data.pop('password')
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()

        # Asignar rol si se especificó
        if rol_nombre:
            try:
                grupo = Group.objects.get(name=rol_nombre)
                usuario.groups.add(grupo)
                
                # Crear el perfil correspondiente automáticamente
                if rol_nombre == 'organizador':
                    Organizador.objects.create(
                        usuario=usuario,
                        razon_social=f"Organizador {usuario.first_name} {usuario.last_name}".strip() or usuario.username,
                        nit_rfc="000000",
                        banco_nombre="Pendiente",
                        cuenta_bancaria="Pendiente"
                    )
                elif rol_nombre == 'artista':
                    Artista.objects.create(
                        usuario=usuario,
                        nombre_artistico=f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username
                    )
                elif rol_nombre == 'verificador':
                    Verificador.objects.create(
                        usuario=usuario,
                        pago=0.0
                    )
            except Group.DoesNotExist:
                pass

        return usuario


# =============================================================================
# SERIALIZER: Artista
# =============================================================================
class ArtistaSerializer(serializers.ModelSerializer):
    foto_url = serializers.ReadOnlyField()
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = Artista
        fields = (
            'id', 'nombre_artistico', 'biografia',
            'foto', 'foto_url',
            'usuario', 'usuario_username',
            'generos_musicales',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'foto_url', 'created_at', 'updated_at')


# =============================================================================
# SERIALIZER: Organizador
# =============================================================================
class OrganizadorSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = Organizador
        fields = (
            'id', 'razon_social', 'nit_rfc',
            'banco_nombre', 'cuenta_bancaria',
            'usuario', 'usuario_username',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


# =============================================================================
# SERIALIZER: Verificador
# =============================================================================
class VerificadorSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = Verificador
        fields = (
            'id', 'pago', 'estado',
            'usuario', 'usuario_username',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


# =============================================================================
# SERIALIZER: Login con datos del usuario
# =============================================================================
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extiende el login JWT para incluir los datos del usuario logueado.
    La respuesta incluye: access, refresh, usuario{}
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        data['usuario'] = UsuarioSerializer(self.user).data
        return data
