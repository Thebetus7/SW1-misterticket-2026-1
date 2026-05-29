import random
from django.core.management.base import BaseCommand
from eventos.models import Departamento, Lugar

class Command(BaseCommand):
    help = 'Crea los 9 departamentos de Bolivia y 5 lugares de ejemplo'

    def handle(self, *args, **kwargs):
        # 1. Crear Departamentos
        departamentos_data = [
            'La Paz', 'Santa Cruz', 'Cochabamba', 
            'Oruro', 'Potosí', 'Tarija', 
            'Chuquisaca', 'Beni', 'Pando'
        ]
        
        deptos_creados = {}
        for nombre in departamentos_data:
            depto, created = Departamento.objects.get_or_create(nombre=nombre)
            deptos_creados[nombre] = depto
            if created:
                self.stdout.write(self.style.SUCCESS(f'Departamento creado: {nombre}'))

        # 2. Crear Lugares
        lugares_data = [
            {
                'nombre': 'Estadio Hernando Siles',
                'direccion': 'Calle Claudio Sanjinés, Miraflores',
                'capacidad_total': 300,
                'departamento': deptos_creados['La Paz']
            },
            {
                'nombre': 'Coliseo Bicentenario',
                'direccion': 'Av. Monseñor Rivero, 3er anillo',
                'capacidad_total': 250,
                'departamento': deptos_creados['Santa Cruz']
            },
            {
                'nombre': 'Feria Internacional de Cochabamba',
                'direccion': 'Av. Beijing, Zona Temporal',
                'capacidad_total': 200,
                'departamento': deptos_creados['Cochabamba']
            },
            {
                'nombre': 'Centro de Convenciones Tarija',
                'direccion': 'Av. La Paz esq. Calle Sucre',
                'capacidad_total': 150,
                'departamento': deptos_creados['Tarija']
            },
            {
                'nombre': 'Teatro Gran Mariscal',
                'direccion': 'Plaza 25 de Mayo, Sucre',
                'capacidad_total': 120,
                'departamento': deptos_creados['Chuquisaca']
            }
        ]

        for data in lugares_data:
            lugar, created = Lugar.objects.get_or_create(
                nombre=data['nombre'],
                defaults={
                    'direccion': data['direccion'],
                    'capacidad_total': data['capacidad_total'],
                    'departamento': data['departamento']
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Lugar creado: {data['nombre']} (Capacidad: {data['capacidad_total']})"))
            else:
                self.stdout.write(self.style.WARNING(f"El lugar {data['nombre']} ya existe."))

        self.stdout.write(self.style.SUCCESS('Seeders de Departamentos y Lugares ejecutados correctamente.'))
