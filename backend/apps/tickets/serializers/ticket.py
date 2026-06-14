from rest_framework import serializers
from ..models import Ticket


class TicketSerializer(serializers.ModelSerializer):
    zona_nombre = serializers.CharField(source='zona.nombre', read_only=True)
    factura_estado = serializers.CharField(
        source='factura.estado_pago', read_only=True
    )
    asiento_detalle = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'codigo_qr', 'estado',
            'asiento', 'asiento_detalle',
            'zona', 'zona_nombre',
            'factura', 'factura_estado',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_asiento_detalle(self, obj):
        """
        Retorna info del asiento si el ticket tiene uno asignado.
        Retorna None si es zona no numerada.
        """
        if obj.asiento:
            return {
                'id': obj.asiento.id,
                'fila': obj.asiento.fila,
                'columna': obj.asiento.columna,
            }
        return None


class MisTicketsSerializer(serializers.ModelSerializer):
    zona_nombre = serializers.CharField(source='zona.nombre', read_only=True)
    evento_nombre = serializers.CharField(source='zona.evento.nombre', read_only=True)
    evento_fecha = serializers.DateTimeField(source='zona.evento.fecha_inicio', read_only=True)
    asiento_detalle = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'codigo_qr', 'estado',
            'zona_nombre', 'evento_nombre', 'evento_fecha',
            'asiento_detalle', 'created_at',
        )
        read_only_fields = ('id', 'created_at')

    def get_asiento_detalle(self, obj):
        if obj.asiento:
            return {
                'id': obj.asiento.id,
                'fila': obj.asiento.fila,
                'columna': obj.asiento.columna,
            }
        return None

