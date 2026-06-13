from django.db import models
from usuarios.models import SoftDeleteModel
from .factura import Factura


class Ticket(SoftDeleteModel):
    """
    Ticket/entrada para un evento.
    Tiene un código QR único para verificación en la entrada.
    """
    codigo_qr = models.CharField(
        max_length=255, unique=True,
        verbose_name='Código QR',
        help_text='Código único para validación del ticket'
    )
    estado = models.CharField(
        max_length=50, default='activo',
        verbose_name='Estado',
        help_text='activo, usado, cancelado, expirado'
    )
    asiento = models.OneToOneField(
        'eventos.Asiento',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='ticket',
        verbose_name='Asiento',
        help_text='NULL si la zona no es numerada'
    )
    zona = models.ForeignKey(
        'eventos.Zona',
        on_delete=models.PROTECT,
        related_name='tickets',
        verbose_name='Zona'
    )
    factura = models.ForeignKey(
        Factura,
        on_delete=models.PROTECT,
        related_name='tickets',
        verbose_name='Factura'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tickets'
        verbose_name = 'Ticket'
        verbose_name_plural = 'Tickets'

    def __str__(self):
        return f"Ticket {self.codigo_qr} - {self.estado}"
