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

        # Be tolerant to inconsistent casing in stored JSON keys.
        # Some clients/admins may store module keys as "Servicios" instead of "servicios".
        module_perms = permissions.get(self.module_key) or {}
        if not isinstance(module_perms, dict):
            module_perms = {}
        if not module_perms and isinstance(permissions, dict):
            key_l = (self.module_key or '').lower()
            if key_l:
                lower_map = {str(k).lower(): v for k, v in permissions.items()}
                module_perms = lower_map.get(key_l) or {}
                if not isinstance(module_perms, dict):
                    module_perms = {}

        # Reportes semanales: sin clave explícita, alinear con órdenes (usuarios previos).
        if (
            self.module_key == 'reportes'
            and not module_perms
            and isinstance(permissions, dict)
        ):
            ord_src = permissions.get('ordenes')
            if isinstance(ord_src, dict):
                module_perms = {
                    'view': ord_src.get('view'),
                    'create': ord_src.get('create'),
                    'edit': False,
                    'delete': ord_src.get('delete'),
                }

        # Map HTTP method to permission key
        method = (request.method or '').upper()
        if method in ('GET', 'HEAD', 'OPTIONS'):
            # Deny by default: if permissions_profile/module_key/view is missing,
            # we must not grant read access implicitly.
            return self._as_bool(module_perms.get('view'), False)
        if method == 'POST':
            return self._as_bool(module_perms.get('create'), False)
        if method in ('PUT', 'PATCH'):
            return self._as_bool(module_perms.get('edit'), False)
        if method == 'DELETE':
            return self._as_bool(module_perms.get('delete'), False)
        
        return False
