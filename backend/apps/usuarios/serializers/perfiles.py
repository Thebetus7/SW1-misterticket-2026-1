from rest_framework import serializers
from ..models import Artista, Organizador, Verificador


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
