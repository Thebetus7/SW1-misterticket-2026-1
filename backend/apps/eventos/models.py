"""
=============================================================================
 APP: eventos
 MODELOS: Departamento, Lugar, GeneroMusical, Evento, Zona, Asiento,
          PresentacionEvento, VerificadorEvento, RegistroAcceso
=============================================================================
"""

from django.db import models
from usuarios.models import SoftDeleteModel


# =============================================================================
# MODELO: Departamento
# =============================================================================
class Departamento(SoftDeleteModel):
    """Departamentos/regiones donde se realizan eventos."""
    nombre = models.CharField(max_length=100, unique=True, verbose_name='Nombre')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'departamentos'
        verbose_name = 'Departamento'
        verbose_name_plural = 'Departamentos'

    def __str__(self):
        return self.nombre


# =============================================================================
# MODELO: Lugar
# =============================================================================
class Lugar(SoftDeleteModel):
    """Lugar físico donde se realizan los eventos."""
    nombre = models.CharField(max_length=255, verbose_name='Nombre')
    direccion = models.TextField(verbose_name='Dirección')
    capacidad_total = models.PositiveIntegerField(verbose_name='Capacidad total')
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.PROTECT,
        related_name='lugares',
        verbose_name='Departamento'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lugares'
        verbose_name = 'Lugar'
        verbose_name_plural = 'Lugares'

    def __str__(self):
        return f"{self.nombre} - {self.departamento.nombre}"


# =============================================================================
# MODELO: GeneroMusical
# =============================================================================
class GeneroMusical(SoftDeleteModel):
    """Géneros musicales para clasificar a los artistas."""
    nombre = models.CharField(max_length=100, unique=True, verbose_name='Nombre')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'generos_musicales'
        verbose_name = 'Género musical'
        verbose_name_plural = 'Géneros musicales'

    def __str__(self):
        return self.nombre


# =============================================================================
# MODELO: Evento
# =============================================================================
class Evento(SoftDeleteModel):
    """Evento musical organizado en la plataforma."""
    nombre = models.CharField(max_length=255, verbose_name='Nombre del evento')
    estado = models.CharField(
        max_length=50, default='borrador',
        verbose_name='Estado',
        help_text='borrador, publicado, en_curso, finalizado, cancelado'
    )
    lugar = models.ForeignKey(
        Lugar,
        on_delete=models.PROTECT,
        related_name='eventos',
        verbose_name='Lugar'
    )
    organizador = models.ForeignKey(
        'usuarios.Organizador',
        on_delete=models.PROTECT,
        related_name='eventos',
        verbose_name='Organizador'
    )
    fecha_inicio = models.DateTimeField(verbose_name='Fecha y hora de inicio', null=True, blank=True)
    fecha_fin = models.DateTimeField(verbose_name='Fecha y hora de fin', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'eventos'
        verbose_name = 'Evento'
        verbose_name_plural = 'Eventos'

    def __str__(self):
        return f"{self.nombre} ({self.estado})"


# =============================================================================
# MODELO: Zona
# =============================================================================
class Zona(SoftDeleteModel):
    """
    Zona dentro de un evento (VIP, General, Platea, etc.)
    es_numerada: indica si la zona tiene asientos numerados o es general.
    """
    nombre = models.CharField(max_length=100, verbose_name='Nombre')
    precio = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Precio')
    capacidad_max = models.PositiveIntegerField(verbose_name='Capacidad máxima')
    entradas_disponibles = models.PositiveIntegerField(verbose_name='Entradas disponibles')
    es_numerada = models.BooleanField(
        default=False,
        verbose_name='¿Es numerada?',
        help_text='Si es True, la zona tiene asientos numerados'
    )
    evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name='zonas',
        verbose_name='Evento'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'zonas'
        verbose_name = 'Zona'
        verbose_name_plural = 'Zonas'

    def __str__(self):
        return f"{self.nombre} - {self.evento.nombre}"


# =============================================================================
# MODELO: Asiento
# =============================================================================
class Asiento(SoftDeleteModel):
    """
    Asiento individual dentro de una zona numerada.
    Solo aplica cuando zona.es_numerada = True.
    """
    fila = models.PositiveIntegerField(verbose_name='Fila')
    columna = models.PositiveIntegerField(verbose_name='Columna')
    estado = models.CharField(
        max_length=50, default='disponible',
        verbose_name='Estado',
        help_text='disponible, reservado, ocupado'
    )
    zona = models.ForeignKey(
        Zona,
        on_delete=models.CASCADE,
        related_name='asientos',
        verbose_name='Zona'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'asientos'
        verbose_name = 'Asiento'
        verbose_name_plural = 'Asientos'
        unique_together = ('fila', 'columna', 'zona')

    def __str__(self):
        return f"Fila {self.fila}, Col {self.columna} - {self.zona.nombre}"


# =============================================================================
# MODELO: PresentacionEvento (tabla intermedia artista-evento)
# =============================================================================
class PresentacionEvento(SoftDeleteModel):
    """
    Presentación de un artista en un evento.
    Define el orden de aparición y la hora de inicio.
    """
    evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name='presentaciones',
        verbose_name='Evento'
    )
    artista = models.ForeignKey(
        'usuarios.Artista',
        on_delete=models.CASCADE,
        related_name='presentaciones',
        verbose_name='Artista'
    )
    orden_aparicion = models.PositiveIntegerField(
        verbose_name='Orden de aparición',
        help_text='Número que indica el orden en que se presenta el artista'
    )
    tiempo_inicio = models.DateTimeField(
        verbose_name='Tiempo de inicio',
        help_text='Fecha y hora en que inicia la presentación'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'presentaciones_evento'
        verbose_name = 'Presentación de evento'
        verbose_name_plural = 'Presentaciones de evento'
        ordering = ['orden_aparicion']

    def __str__(self):
        return f"#{self.orden_aparicion} {self.artista.nombre_artistico} en {self.evento.nombre}"


# =============================================================================
# MODELO: VerificadorEvento
# =============================================================================
class VerificadorEvento(SoftDeleteModel):
    """
    Relación entre un verificador y un evento.
    Un verificador puede estar asignado a múltiples eventos.
    """
    evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name='verificadores_evento',
        verbose_name='Evento'
    )
    verificador = models.ForeignKey(
        'usuarios.Verificador',
        on_delete=models.CASCADE,
        related_name='eventos_asignados',
        verbose_name='Verificador'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'verificadores_evento'
        verbose_name = 'Verificador de evento'
        verbose_name_plural = 'Verificadores de evento'
        unique_together = ('evento', 'verificador')

    def __str__(self):
        return f"{self.verificador} → {self.evento.nombre}"


# =============================================================================
# MODELO: RegistroAcceso
# =============================================================================
class RegistroAcceso(SoftDeleteModel):
    """
    Registro de cada intento de acceso/verificación de un ticket.
    Guarda si el acceso fue exitoso o no.
    """
    resultado = models.CharField(
        max_length=50,
        verbose_name='Resultado',
        help_text='aprobado, rechazado, ya_usado, invalido'
    )
    verificador_evento = models.ForeignKey(
        VerificadorEvento,
        on_delete=models.CASCADE,
        related_name='registros_acceso',
        verbose_name='Verificador del evento'
    )
    ticket = models.ForeignKey(
        'tickets.Ticket',
        on_delete=models.CASCADE,
        related_name='registros_acceso',
        verbose_name='Ticket'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'registros_acceso'
        verbose_name = 'Registro de acceso'
        verbose_name_plural = 'Registros de acceso'

    def __str__(self):
        return f"Acceso {self.resultado} - Ticket #{self.ticket.id}"
