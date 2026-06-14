from rest_framework import serializers
from ..models import Ticket, Factura
from eventos.models import Evento, Zona


class CompraRequestSerializer(serializers.Serializer):
    evento_id = serializers.IntegerField(required=True)
    zona_id = serializers.IntegerField(required=True)
    cantidad = serializers.IntegerField(required=True, min_value=1)
    payment_method_id = serializers.CharField(required=True, max_length=255)

    def validate(self, data):
        evento_id = data.get('evento_id')
        zona_id = data.get('zona_id')
        cantidad = data.get('cantidad')

        try:
            evento = Evento.objects.get(id=evento_id, estado='publicado')
        except Evento.DoesNotExist:
            raise serializers.ValidationError({"evento_id": "El evento no existe o no está publicado."})

        try:
            zona = Zona.objects.get(id=zona_id, evento=evento)
        except Zona.DoesNotExist:
            raise serializers.ValidationError({"zona_id": "La zona no pertenece a este evento o no existe."})

        if zona.entradas_disponibles < cantidad:
            raise serializers.ValidationError(
                {"cantidad": f"No hay suficientes entradas disponibles en esta zona. Disponibles: {zona.entradas_disponibles}"}
            )

        data['evento'] = evento
        data['zona'] = zona
        return data


class TicketCompradoSerializer(serializers.ModelSerializer):
    zona_nombre = serializers.CharField(source='zona.nombre', read_only=True)
    evento_nombre = serializers.CharField(source='zona.evento.nombre', read_only=True)
    evento_fecha = serializers.DateTimeField(source='zona.evento.fecha_inicio', read_only=True)
    asiento_detalle = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'codigo_qr', 'zona_nombre', 'asiento_detalle',
            'evento_nombre', 'evento_fecha'
        )

    def get_asiento_detalle(self, obj):
        if obj.asiento:
            return {
                'id': obj.asiento.id,
                'fila': obj.asiento.fila,
                'columna': obj.asiento.columna,
            }
        return None


class CompraResponseSerializer(serializers.ModelSerializer):
    factura_id = serializers.IntegerField(source='id', read_only=True)
    precio_total = serializers.DecimalField(source='precio', max_digits=10, decimal_places=2, read_only=True)
    tickets = TicketCompradoSerializer(many=True, read_only=True)

    class Meta:
        model = Factura
        fields = (
            'factura_id', 'estado_pago', 'precio_total',
            'stripe_payment_intent_id', 'tickets'
        )
