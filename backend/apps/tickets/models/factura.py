from django.db import models
from usuarios.models import SoftDeleteModel


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
