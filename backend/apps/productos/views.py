from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Producto
from .serializers import ProductoSerializer

class ProductoViewSet(viewsets.ModelViewSet):
    """
    CRUD Completo para Productos.
    Requiere estar autenticado. Para roles específicos se puede extender los permission_classes.
    """
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated]
