"""Server-side GeoIP detection.

Replaces the previous frontend-side approach that sent the user's IP to
a third-party service (geojs.io) BEFORE consent — which itself was a
potential GDPR violation (transferring personal data without consent).

This module uses the MaxMind GeoLite2 database when available, and falls
back to a simple country header check from CDN/proxy headers.
"""

import logging

from .consent import get_client_ip

logger = logging.getLogger("gdpr.geoip")

EU_EEA_COUNTRIES = {
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
    # EEA members (not EU but GDPR applies)
    "IS", "LI", "NO",
    # UK (post-Brexit: UK GDPR applies, same rules)
    "GB",
}


def is_eu_visitor(request) -> bool:
    """Detect if the request comes from an EU/EEA country.

    Detection order:
    1. CF-IPCountry header (Cloudflare)
    2. X-Country-Code header (custom CDN/proxy)
    3. MaxMind GeoLite2 database (if geoip2 is installed)
    4. Default: True (fail-safe — show banner if uncertain)
    """
    # 1. Cloudflare header
    country = request.META.get("HTTP_CF_IPCOUNTRY", "").upper()
    if country:
        return country in EU_EEA_COUNTRIES

    # 2. Custom CDN/proxy header
    country = request.META.get("HTTP_X_COUNTRY_CODE", "").upper()
    if country:
        return country in EU_EEA_COUNTRIES

    # 3. MaxMind GeoLite2 (if installed)
    try:
        import geoip2.database
        from django.conf import settings as django_settings

        db_path = getattr(django_settings, "GEOIP_PATH", None)
        if db_path:
            ip = get_client_ip(request)
            with geoip2.database.Reader(db_path) as reader:
                response = reader.country(ip)
                return response.country.iso_code in EU_EEA_COUNTRIES
    except ImportError:
        pass  # geoip2 not installed
    except Exception as e:
        logger.debug("GeoIP lookup failed: %s", e)

    # 4. Fail-safe: assume EU (show the banner)
    return True
