from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import FacturaViewSet, TicketViewSet

router = DefaultRouter()
router.register(r'facturas', FacturaViewSet, basename='factura')
router.register(r'tickets', TicketViewSet, basename='ticket')

urlpatterns = [
    path('', include(router.urls)),
]
