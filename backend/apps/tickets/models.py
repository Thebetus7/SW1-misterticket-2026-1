"""
=============================================================================
 APP: tickets
 MODELOS: Factura, Ticket
=============================================================================
"""

from django.db import models
from usuarios.models import SoftDeleteModel


# =============================================================================
# MODELO: Factura
# =============================================================================
class Factura(SoftDeleteModel):
    """
    Factura de compra de tickets.
    Un cliente (usuario) puede tener múltiples facturas.
    """
    precio = models.DecimalField(
        max_digits=10, decimal_places=2,
        verbose_name='Precio total'
    )
    estado_pago = models.CharField(
        max_length=50, default='pendiente',
        verbose_name='Estado del pago',
        help_text='pendiente, pagado, reembolsado, cancelado'
    )
    cliente = models.ForeignKey(
        'usuarios.Usuario',
        on_delete=models.PROTECT,
        related_name='facturas',
        verbose_name='Cliente'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'facturas'
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'

    def __str__(self):
        return f"Factura #{self.id} - {self.cliente.username} - {self.estado_pago}"


# =============================================================================
# MODELO: Ticket
# =============================================================================
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
