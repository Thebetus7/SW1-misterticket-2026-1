from django.db import models
from .base import SoftDeleteModel
from .usuario import Usuario
from .promotor import Promotor


class Vendedor(SoftDeleteModel):
    """
    Perfil de vendedor. Usuario creado y gestionado por un Promotor
    para escanear o vender entradas de sus eventos.
    """
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name='perfil_vendedor',
        verbose_name='Usuario'
    )
    promotor = models.ForeignKey(
        Promotor,
        on_delete=models.CASCADE,
        related_name='vendedores',
        verbose_name='Promotor'
    )
    estado = models.CharField(
        max_length=50, default='activo',
        verbose_name='Estado',
        help_text='Estado del vendedor: activo, inactivo, suspendido'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vendedores'
        verbose_name = 'Vendedor'
        verbose_name_plural = 'Vendedores'

    def __str__(self):
        return f"Vendedor: {self.usuario.username} (Promotor: {self.promotor.razon_social})"
