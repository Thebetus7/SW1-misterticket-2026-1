"""
=============================================================================
 APP: usuarios
 MODELOS: Persona, Usuario, Artista, Organizador, Verificador
 
 SISTEMA DE ROLES Y PERMISOS:
   - Django usa Groups (≈ Spatie Roles) y Permissions (≈ Spatie Permissions)
   - Los 3 roles: organizador, verificador, artista
   - Los 4 permisos custom: gestionar_eventos, verificar_tickets,
     gestionar_artistas, ver_reportes
   - Se crean automáticamente en la señal post_migrate (ver apps.py)
=============================================================================
"""

import os
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .managers import SoftDeleteManager, AllObjectsManager, UsuarioManager


# =============================================================================
# MODELO BASE CON SOFT DELETE
# =============================================================================
class SoftDeleteModel(models.Model):
    """
    Modelo abstracto que implementa soft-delete.
    En vez de borrar registros de la BD, se marca el campo 'deleted_at'.
    
    Uso:
        - objeto.delete()       → Soft delete (marca deleted_at)
        - objeto.hard_delete()  → Elimina de la BD permanentemente
        - objeto.restore()      → Restaura un registro eliminado
        - MiModelo.objects.all()       → Solo registros activos
        - MiModelo.all_objects.all()   → Todos, incluyendo eliminados
    """
    deleted_at = models.DateTimeField(
        null=True, blank=True, default=None,
        verbose_name='Fecha de eliminación',
        help_text='Si tiene valor, el registro está soft-deleted'
    )

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Soft delete: marca el campo deleted_at en lugar de eliminar"""
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])

    def hard_delete(self, using=None, keep_parents=False):
        """Elimina permanentemente el registro de la base de datos"""
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """Restaura un registro soft-deleted"""
        self.deleted_at = None
        self.save(update_fields=['deleted_at'])

    @property
    def is_deleted(self):
        return self.deleted_at is not None


# =============================================================================
# MODELO: Persona
# =============================================================================
class Persona(SoftDeleteModel):
    """
    Datos personales, separados del usuario para mantener 
    la responsabilidad única (SRP). Un usuario TIENE una persona.
    """
    nombre = models.CharField(max_length=255, verbose_name='Nombre completo')
    ci = models.CharField(
        max_length=20, unique=True,
        verbose_name='Cédula de identidad'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'personas'
        verbose_name = 'Persona'
        verbose_name_plural = 'Personas'

    def __str__(self):
        return f"{self.nombre} (CI: {self.ci})"


# =============================================================================
# MODELO: Usuario (Custom User Model)
# =============================================================================
class Usuario(AbstractUser, SoftDeleteModel):
    """
    Modelo de usuario personalizado que extiende AbstractUser.
    
    SISTEMA DE ROLES (equivalente a Spatie en Laravel):
    ─────────────────────────────────────────────────
    Django tiene un sistema nativo de Groups y Permissions:
    
    → Group = Role en Spatie
      Ejemplo: usuario.groups.add(grupo_organizador)
               usuario.groups.filter(name='organizador').exists()
    
    → Permission = Permission en Spatie
      Ejemplo: usuario.has_perm('usuarios.gestionar_eventos')
               usuario.user_permissions.add(permiso)
    
    Los permisos se pueden asignar:
      1. Directamente al usuario: usuario.user_permissions.add(...)
      2. A través de un grupo/rol: grupo.permissions.add(...)
         (el usuario hereda los permisos del grupo)
    """
    email = models.EmailField(unique=True, verbose_name='Correo electrónico')
    persona = models.OneToOneField(
        Persona,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='usuario',
        verbose_name='Persona'
    )

    # Timestamps (AbstractUser ya tiene date_joined y last_login)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Usar nuestro manager personalizado
    objects = UsuarioManager()
    all_objects = AllObjectsManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        # ─── PERMISOS PERSONALIZADOS ───
        # Estos son los 4 permisos custom que se asignarán a los roles.
        # Equivalente a definir permisos en Spatie.
        # Para verificar: usuario.has_perm('usuarios.gestionar_eventos')
        permissions = [
            ('gestionar_eventos', 'Puede crear, editar y eliminar eventos'),
            ('verificar_tickets', 'Puede escanear y verificar tickets en el acceso'),
            ('gestionar_artistas', 'Puede administrar perfiles de artistas'),
            ('ver_reportes', 'Puede ver reportes financieros y de ventas'),
        ]

    def get_roles(self):
        """Retorna lista de nombres de los grupos/roles del usuario"""
        return list(self.groups.values_list('name', flat=True))

    def has_role(self, role_name):
        """Verifica si el usuario tiene un rol específico"""
        return self.groups.filter(name=role_name).exists()

    def assign_role(self, group):
        """Asigna un rol (Group) al usuario"""
        self.groups.add(group)

    def remove_role(self, group):
        """Remueve un rol (Group) del usuario"""
        self.groups.remove(group)

    def __str__(self):
        return self.username


# =============================================================================
# MODELO: Artista
# =============================================================================
def artista_foto_upload_path(instance, filename):
    """
    ──────────────────────────────────────────────────────────────
    FUNCIÓN PARA SUBIR FOTOS DE ARTISTAS
    ──────────────────────────────────────────────────────────────
    Esta función determina la ruta donde se guardará la foto del artista.
    
    Cómo funciona la lógica de subida de archivos en Django:
    
    1. Django usa el campo ImageField/FileField para manejar archivos.
    2. El parámetro 'upload_to' puede ser un string o una función callable.
    3. Aquí usamos una función para generar rutas dinámicas por artista.
    
    La foto se guardará en: MEDIA_ROOT/artistas/fotos/<artista_id>/<filename>
    
    Para que funcione necesitas en settings.py:
        MEDIA_URL = '/media/'
        MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
    
    Y en urls.py (solo en desarrollo):
        from django.conf import settings
        from django.conf.urls.static import static
        if settings.DEBUG:
            urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
    Ejemplo de uso desde una vista/serializer:
        artista.foto = request.FILES['foto']  # Django automáticamente llama a esta función
        artista.save()
    
    La URL pública será: http://localhost:8000/media/artistas/fotos/1/mi_foto.jpg
    ──────────────────────────────────────────────────────────────
    """
    # Obtener la extensión del archivo original
    ext = filename.split('.')[-1]
    # Generar un nombre único usando el ID del artista
    new_filename = f"foto_artista_{instance.pk or 'temp'}.{ext}"
    return os.path.join('artistas', 'fotos', str(instance.pk or 'temp'), new_filename)


class Artista(SoftDeleteModel):
    """
    Perfil de artista. Puede o no estar vinculado a un usuario del sistema.
    Si usuario_id es NULL, significa que el artista fue creado por un organizador
    pero no tiene cuenta propia en la plataforma.
    """
    nombre_artistico = models.CharField(max_length=255, verbose_name='Nombre artístico')
    biografia = models.TextField(blank=True, null=True, verbose_name='Biografía')
    
    # ──────────────────────────────────────────────────────────────
    # CAMPO DE FOTO CON ImageField
    # ──────────────────────────────────────────────────────────────
    # ImageField hereda de FileField y agrega validación de imagen.
    # - upload_to: función que define la ruta de almacenamiento (ver arriba)
    # - blank=True, null=True: la foto es opcional
    # - Para usarlo se necesita instalar Pillow: pip install Pillow
    # ──────────────────────────────────────────────────────────────
    foto = models.ImageField(
        upload_to=artista_foto_upload_path,
        blank=True, null=True,
        verbose_name='Foto del artista',
        help_text='Imagen de perfil del artista. Se guarda en media/artistas/fotos/'
    )

    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='perfil_artista',
        verbose_name='Usuario vinculado'
    )

    # Relación muchos a muchos con GeneroMusical (tabla intermedia)
    generos_musicales = models.ManyToManyField(
        'eventos.GeneroMusical',
        blank=True,
        related_name='artistas',
        verbose_name='Géneros musicales',
        db_table='artista_genero_musical'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'artistas'
        verbose_name = 'Artista'
        verbose_name_plural = 'Artistas'

    @property
    def foto_url(self):
        """
        Retorna la URL pública de la foto del artista.
        Si no tiene foto, retorna None.
        Uso en serializer: artista.foto_url
        """
        if self.foto and hasattr(self.foto, 'url'):
            return self.foto.url
        return None

    def __str__(self):
        return self.nombre_artistico


# =============================================================================
# MODELO: Organizador
# =============================================================================
class Organizador(SoftDeleteModel):
    """
    Perfil de organizador de eventos.
    Contiene datos fiscales y bancarios para liquidaciones.
    """
    razon_social = models.CharField(max_length=255, verbose_name='Razón social')
    nit_rfc = models.CharField(max_length=50, verbose_name='NIT/RFC')
    banco_nombre = models.CharField(max_length=100, verbose_name='Nombre del banco')
    cuenta_bancaria = models.CharField(max_length=50, verbose_name='Cuenta bancaria')

    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name='perfil_organizador',
        verbose_name='Usuario'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organizadores'
        verbose_name = 'Organizador'
        verbose_name_plural = 'Organizadores'

    def __str__(self):
        return self.razon_social


# =============================================================================
# MODELO: Verificador
# =============================================================================
class Verificador(SoftDeleteModel):
    """
    Perfil de verificador. Persona encargada de escanear 
    y validar tickets en la entrada de los eventos.
    """
    pago = models.DecimalField(
        max_digits=10, decimal_places=2,
        verbose_name='Pago',
        help_text='Monto de pago al verificador'
    )
    estado = models.CharField(
        max_length=50, default='activo',
        verbose_name='Estado',
        help_text='Estado del verificador: activo, inactivo, suspendido'
    )

    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name='perfil_verificador',
        verbose_name='Usuario'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'verificadores'
        verbose_name = 'Verificador'
        verbose_name_plural = 'Verificadores'

    def __str__(self):
        return f"Verificador: {self.usuario.username} - {self.estado}"
