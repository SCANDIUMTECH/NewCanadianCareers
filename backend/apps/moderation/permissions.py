from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """
    Permission class to check if user is admin
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_staff
