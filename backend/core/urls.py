from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static


def home(request):
    return JsonResponse({"message": "Bienvenido a la API de MisterTicket"})


urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/usuarios/', include('usuarios.urls')),
]

# Servir archivos media en desarrollo (fotos de artistas, etc.)
# En producción esto lo maneja Nginx/Apache
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
