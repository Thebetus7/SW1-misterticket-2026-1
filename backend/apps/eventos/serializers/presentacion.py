from rest_framework import serializers
from ..models import PresentacionEvento


class PresentacionEventoSerializer(serializers.ModelSerializer):
    artista_nombre = serializers.CharField(
        source='artista.nombre_artistico', read_only=True
    )
    evento_nombre = serializers.CharField(source='evento.nombre', read_only=True)

    class Meta:
        model = PresentacionEvento
        fields = (
            'id', 'orden_aparicion', 'tiempo_inicio',
            'evento', 'evento_nombre',
            'artista', 'artista_nombre',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
