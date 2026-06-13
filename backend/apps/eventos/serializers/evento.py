from rest_framework import serializers
from ..models import Evento
from .zona_asiento import ZonaSerializer


class EventoSerializer(serializers.ModelSerializer):
    lugar_nombre = serializers.CharField(source='lugar.nombre', read_only=True)
    organizador_razon = serializers.CharField(
        source='organizador.razon_social', read_only=True
    )
    zonas = ZonaSerializer(many=True, read_only=True)

    class Meta:
        model = Evento
        fields = (
            'id', 'nombre', 'estado',
            'lugar', 'lugar_nombre',
            'organizador', 'organizador_razon',
            'zonas',
            'fecha_inicio', 'fecha_fin',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'organizador')


class ZonaCrearSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=100)
    precio = serializers.DecimalField(max_digits=10, decimal_places=2)
    cantidad_asientos = serializers.IntegerField(min_value=1)


class EventoCrearSerializer(serializers.ModelSerializer):
    zonas = ZonaCrearSerializer(many=True, write_only=True)

    class Meta:
        model = Evento
        fields = ('id', 'nombre', 'estado', 'lugar', 'fecha_inicio', 'fecha_fin', 'zonas')

    def validate(self, data):
        lugar = data.get('lugar')
        zonas = data.get('zonas', [])

        if not zonas:
            raise serializers.ValidationError({"zonas": "Debes crear al menos una zona."})

        total_asientos = sum(z['cantidad_asientos'] for z in zonas)
        if total_asientos > lugar.capacidad_total:
            raise serializers.ValidationError({
                "zonas": f"La suma de asientos ({total_asientos}) excede "
                         f"la capacidad del lugar ({lugar.capacidad_total})."
            })
        return data
