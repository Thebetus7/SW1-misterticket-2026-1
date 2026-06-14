import uuid
import stripe
from django.conf import settings
from django.db import transaction
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from ..models import Ticket, Factura
from ..serializers.compra import CompraRequestSerializer, CompraResponseSerializer
from eventos.models import Asiento


class CompraView(APIView):
    """
    POST /api/tickets/comprar/
    Procesa la compra de tickets de forma atómica integrando Stripe.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = CompraRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        evento = serializer.validated_data['evento']
        zona = serializer.validated_data['zona']
        cantidad = serializer.validated_data['cantidad']
        payment_method_id = serializer.validated_data['payment_method_id']

        monto_total = zona.precio * cantidad

        # Si es compra directa para desarrollo, simular éxito en Stripe
        if payment_method_id == "pm_desarrollo_directo":
            intent_id = f"pi_dev_{uuid.uuid4().hex[:12].upper()}"
        else:
            # Configurar Stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            if not stripe.api_key:
                return Response(
                    {"detail": "La pasarela de pagos no está configurada (STRIPE_SECRET_KEY faltante)."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # 1. Crear y confirmar el PaymentIntent en Stripe
            try:
                intent = stripe.PaymentIntent.create(
                    amount=int(monto_total * 100),  # Stripe recibe centavos
                    currency='bob',  # Bolivianos
                    payment_method=payment_method_id,
                    confirm=True,
                    automatic_payment_methods={
                        'enabled': True,
                        'allow_redirects': 'never',
                    }
                )
            except stripe.CardError as e:
                return Response(
                    {"detail": f"Error de tarjeta: {e.user_message or str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except stripe.StripeError as e:
                return Response(
                    {"detail": f"Error en la pasarela de pagos: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                return Response(
                    {"detail": f"Error inesperado al procesar el pago: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Verificar que el pago se haya completado con éxito
            if intent.status != 'succeeded':
                return Response(
                    {"detail": f"El pago no pudo completarse. Estado: {intent.status}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            intent_id = intent.id

        # 2. Registrar la Factura
        factura = Factura.objects.create(
            precio=monto_total,
            estado_pago='pagado',
            cliente=request.user,
            stripe_payment_intent_id=intent_id
        )


        tickets_creados = []

        # 3. Asignar asientos y generar los Tickets
        if zona.es_numerada:
            # Buscar asientos desocupados o disponibles
            asientos_libres = list(Asiento.objects.filter(
                zona=zona,
                estado__in=['desocupado', 'disponible']
            ).order_by('fila', 'columna')[:cantidad])

            if len(asientos_libres) < cantidad:
                # Si por alguna razón paralela ya no hay asientos libres (race condition)
                # En un sistema real haríamos un reembolso, aquí lanzamos error
                raise serializers.ValidationError(
                    "No hay suficientes asientos disponibles físicamente en esta zona."
                )

            for asiento in asientos_libres:
                asiento.estado = 'ocupado'
                asiento.save()

                ticket = Ticket.objects.create(
                    codigo_qr=f"MT-{uuid.uuid4().hex[:12].upper()}",
                    estado='activo',
                    asiento=asiento,
                    zona=zona,
                    factura=factura
                )
                tickets_creados.append(ticket)
        else:
            # Zona no numerada (generalmente de pie, sin asiento asignado)
            for _ in range(cantidad):
                ticket = Ticket.objects.create(
                    codigo_qr=f"MT-{uuid.uuid4().hex[:12].upper()}",
                    estado='activo',
                    asiento=None,
                    zona=zona,
                    factura=factura
                )
                tickets_creados.append(ticket)

        # 4. Decrementar capacidad disponible de la zona
        zona.entradas_disponibles -= cantidad
        zona.save()

        # Responder con la factura y sus tickets
        # Inyectamos temporalmente los tickets a la factura para que el serializer los renderice
        # (ya que prefetch/related_name no se refresca inmediatamente en memoria si no recargamos de bd)
        factura.tickets_list = tickets_creados
        
        # Usamos una representación serializada
        # Nota: El serializer CompraResponseSerializer usa la relación tickets de Factura (related_name='tickets')
        # Dado que acabamos de crearlos en bd y están vinculados por FK, si los serializamos directamente 
        # Django resolverá la consulta a la BD.
        serializer_res = CompraResponseSerializer(factura)
        return Response(serializer_res.data, status=status.HTTP_201_CREATED)
