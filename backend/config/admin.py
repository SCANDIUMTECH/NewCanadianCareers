"""
Custom Django admin site with security hardening.

- Logs failed login attempts via django.security logger
- Custom site header/title for NCC branding
"""
import logging

from django.contrib import admin
from django.contrib.auth import REDIRECT_FIELD_NAME

security_logger = logging.getLogger('django.security')


class NccAdminSite(admin.AdminSite):
    site_header = 'NCC Administration'
    site_title = 'NCC Admin'
    index_title = 'Platform Administration'

    def login(self, request, extra_context=None):
        """Override login to log failed attempts."""
        if request.method == 'POST':
            response = super().login(request, extra_context)
            # If still on the login page after POST, the login failed
            if hasattr(response, 'status_code') and response.status_code == 200:
                username = request.POST.get('username', '<empty>')
                ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
                if ',' in ip:
                    ip = ip.split(',')[0].strip()
                security_logger.warning(
                    'Django admin login failure: user=%s ip=%s',
                    username,
                    ip,
                )
            return response
        return super().login(request, extra_context)


ncc_admin_site = NccAdminSite(name='ncc_admin')
