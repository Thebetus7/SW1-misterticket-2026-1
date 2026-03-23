from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import ProductoViewSet

router = DefaultRouter()
router.register(r'', ProductoViewSet, basename='producto')

urlpatterns = [
    path('', include(router.urls)),
]
