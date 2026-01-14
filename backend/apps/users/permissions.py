"""
Custom permission classes for JSON-based module permissions.
"""
from rest_framework.permissions import BasePermission


class ModulePermission(BasePermission):
    """
    Base permission class that checks user permissions from JSON profile.
    
    Subclasses should define `module_key` to specify which module to check.
    Permissions are checked based on HTTP method:
    - GET/HEAD/OPTIONS: requires 'view' permission
    - POST: requires 'create' permission
    - PUT/PATCH: requires 'edit' permission
    - DELETE: requires 'delete' permission
    
    Superusers and staff always have access.
    """
    module_key = None  # Must be overridden in subclass

    def _as_bool(self, value, default=False):
        """
        Convert various value types to boolean.
        
        Args:
            value: Value to convert (bool, str, or other)
            default: Default value if conversion fails
            
        Returns:
            bool: Converted boolean value
        """
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized == 'true':
                return True
            if normalized == 'false':
                return False
        return default

    def has_permission(self, request, view):
        """
        Check if user has permission for the requested action.
        
        Args:
            request: The HTTP request
            view: The view being accessed
            
        Returns:
            bool: True if user has permission, False otherwise
        """
        if not self.module_key:
            raise NotImplementedError(
                f'{self.__class__.__name__} must define module_key'
            )

        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False

        # Superusers and staff always have access
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True

        # Get user's permission profile
        perms_obj = getattr(user, 'permissions_profile', None)
        permissions = getattr(perms_obj, 'permissions', None) or {}
        module_perms = permissions.get(self.module_key) or {}

        # Map HTTP method to permission key
        method = (request.method or '').upper()
        if method in ('GET', 'HEAD', 'OPTIONS'):
            return self._as_bool(module_perms.get('view'), True)
        if method == 'POST':
            return self._as_bool(module_perms.get('create'), False)
        if method in ('PUT', 'PATCH'):
            return self._as_bool(module_perms.get('edit'), False)
        if method == 'DELETE':
            return self._as_bool(module_perms.get('delete'), False)
        
        return False
