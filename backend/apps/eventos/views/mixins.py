from rest_framework import status
from rest_framework.response import Response


class SoftDeleteMixin:
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()  # Soft delete del modelo base
        return Response(
            {'detail': f'{instance.__class__.__name__} eliminado (soft delete).'},
            status=status.HTTP_200_OK
        )
