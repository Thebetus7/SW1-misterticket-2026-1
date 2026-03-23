from django.contrib.auth.models import AbstractUser, Group
from django.db import models

class Usuario(AbstractUser):
    # Heredamos de AbstractUser que ya tiene username, password, email, is_staff, etc.
    # Agregamos campos adicionales si queremos
    telefono = models.CharField(max_length=20, blank=True, null=True)
    
    # Para el manejo de roles estilo Spatie, Django ya usa los 'Groups' de forma nativa.
    # Spatie Role = Django Group
    # Spatie Permission = Django Permission
    
    def get_roles(self):
        """Retorna una lista de nombres de los grupos/roles del usuario"""
        return list(self.groups.values_list('name', flat=True))

    def __str__(self):
        return self.username
