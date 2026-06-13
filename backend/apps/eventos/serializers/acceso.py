from rest_framework import serializers
from ..models import VerificadorEvento, RegistroAcceso


class VerificadorEventoSerializer(serializers.ModelSerializer):
    verificador_username = serializers.CharField(
        source='verificador.usuario.username', read_only=True
    )
    evento_nombre = serializers.CharField(source='evento.nombre', read_only=True)

    class Meta:
        model = VerificadorEvento
        fields = (
            'id',
            'evento', 'evento_nombre',
            'verificador', 'verificador_username',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class RegistroAccesoSerializer(serializers.ModelSerializer):
    verificador_evento_id = serializers.IntegerField(
        source='verificador_evento.id', read_only=True
    )

    class Meta:
        model = RegistroAcceso
        fields = (
            'id', 'resultado',
            'verificador_evento', 'verificador_evento_id',
            'ticket',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
