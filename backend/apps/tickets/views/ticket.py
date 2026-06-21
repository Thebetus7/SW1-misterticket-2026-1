from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q

from ..models import Ticket, TransferenciaTicket
from ..serializers import TicketSerializer, MisTicketsSerializer
from ..serializers.transferencia import TransferirTicketSerializer
from usuarios.models import Notificacion
from .mixins import SoftDeleteMixin

Usuario = get_user_model()


class TicketViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """
    GET    /api/tickets/tickets/         → Listar (filtrable por ?factura=<id> o ?zona=<id>)
    POST   /api/tickets/tickets/         → Crear
    GET    /api/tickets/tickets/{id}/    → Detalle
    PUT    /api/tickets/tickets/{id}/    → Actualizar
    PATCH  /api/tickets/tickets/{id}/    → Actualizar parcial (ej: estado)
    DELETE /api/tickets/tickets/{id}/    → Soft delete
    """
    queryset = Ticket.objects.select_related('zona__evento', 'factura', 'asiento').all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        factura_id = self.request.query_params.get('factura')
        zona_id = self.request.query_params.get('zona')
        if factura_id:
            qs = qs.filter(factura_id=factura_id)
        if zona_id:
            qs = qs.filter(zona_id=zona_id)
        return qs

    @action(detail=False, url_path='mis-tickets', methods=['get'])
    def mis_tickets(self, request):
        tickets = Ticket.objects.filter(
            Q(propietario=request.user)
            | Q(propietario__isnull=True, factura__cliente=request.user)
        ).select_related(
            'zona__evento', 'asiento'
        ).order_by('-created_at')

        serializer = MisTicketsSerializer(tickets, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='transferir')
    @transaction.atomic
    def transferir(self, request, pk=None):
        """
        POST /api/tickets/tickets/{id}/transferir/
        Transfiere un ticket a otro usuario fan. Solo se permite una transferencia por ticket.
        Body: { "destinatario_id": <id_usuario> }
        """
        ticket = self.get_object()
        serializer = TransferirTicketSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        destinatario = Usuario.objects.get(id=serializer.validated_data['destinatario_id'])

        if ticket.propietario_id != request.user.id and not (
            ticket.propietario_id is None and ticket.factura.cliente_id == request.user.id
        ):
            return Response(
                {'detail': 'Solo el propietario actual puede transferir este ticket.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if ticket.transferido:
            return Response(
                {'detail': 'Este ticket ya fue transferido anteriormente. Solo se permite una transferencia.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ticket.estado != 'activo':
            return Response(
                {'detail': f'No se puede transferir un ticket con estado "{ticket.estado}".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        evento = ticket.zona.evento
        if evento.fecha_inicio <= timezone.now():
            return Response(
                {'detail': 'No se puede transferir un ticket de un evento que ya comenzó.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not destinatario.has_role('fan'):
            return Response(
                {'detail': 'Solo puedes transferir tickets a usuarios con rol fan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        TransferenciaTicket.objects.create(
            ticket=ticket,
            origen=request.user,
            destino=destinatario,
        )

        ticket.propietario = destinatario
        ticket.transferido = True
        ticket.save(update_fields=['propietario', 'transferido', 'updated_at'])

        Notificacion.objects.create(
            usuario=destinatario,
            titulo='¡Recibiste un ticket!',
            mensaje=(
                f'{request.user.username} te transfirió un ticket para '
                f'"{evento.nombre}" ({ticket.zona.nombre}).'
            ),
            tipo='ticket_recibido',
            evento=evento,
        )

        return Response(
            {
                'detail': f'Ticket transferido exitosamente a {destinatario.username}.',
                'ticket': MisTicketsSerializer(ticket).data,
            },
            status=status.HTTP_200_OK,
        )

