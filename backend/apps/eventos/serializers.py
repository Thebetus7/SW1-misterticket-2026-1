from rest_framework import serializers
from .models import (
    Departamento, Lugar, GeneroMusical, Evento,
    Zona, Asiento, PresentacionEvento, VerificadorEvento, RegistroAcceso,
)


# =============================================================================
# SERIALIZER: Departamento
# =============================================================================
class DepartamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departamento
        fields = ('id', 'nombre', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


# =============================================================================
# SERIALIZER: Lugar
# =============================================================================
class LugarSerializer(serializers.ModelSerializer):
    departamento_nombre = serializers.CharField(
        source='departamento.nombre', read_only=True
    )

    class Meta:
        model = Lugar
        fields = (
            'id', 'nombre', 'direccion', 'capacidad_total',
            'departamento', 'departamento_nombre',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


# =============================================================================
# SERIALIZER: GeneroMusical
# =============================================================================
class GeneroMusicalSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneroMusical
        fields = ('id', 'nombre', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


# =============================================================================
# SERIALIZER: Zona (anidado, usado dentro de Evento)
# =============================================================================
class ZonaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zona
        fields = (
            'id', 'nombre', 'precio', 'capacidad_max',
            'entradas_disponibles', 'es_numerada',
            'evento', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


# =============================================================================
# SERIALIZER: Asiento
# =============================================================================
class AsientoSerializer(serializers.ModelSerializer):
    zona_nombre = serializers.CharField(source='zona.nombre', read_only=True)

    class Meta:
        model = Asiento
        fields = (
            'id', 'fila', 'columna', 'estado',
            'zona', 'zona_nombre',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


# =============================================================================
# SERIALIZER: Evento
# =============================================================================
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


# =============================================================================
# SERIALIZER: Crear Evento con Zonas
# =============================================================================
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


# =============================================================================
# SERIALIZER: PresentacionEvento
# =============================================================================
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


# =============================================================================
# SERIALIZER: VerificadorEvento
# =============================================================================
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


# =============================================================================
# SERIALIZER: RegistroAcceso
# =============================================================================
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
