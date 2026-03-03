"""
Stripe key management service.

Resolves Stripe API keys from database (PlatformSettings) first,
falling back to environment variables. Keys in the database are
encrypted at rest using Fernet (AES-128-CBC + HMAC-SHA256).

Provides both the modern StripeClient pattern (preferred) and the
legacy configure_stripe() function for backward compatibility.
"""
import logging
import warnings
import stripe
from stripe import StripeClient
from django.conf import settings

logger = logging.getLogger(__name__)


def get_stripe_keys() -> dict:
    """Return all Stripe keys, preferring DB over env vars.

    Returns dict with:
        - publishable_key
        - secret_key
        - webhook_secret
    """
    from apps.moderation.models import PlatformSettings

    try:
        ps = PlatformSettings.get_settings()
        publishable = ps.stripe_publishable_key or ''
        secret = ps.stripe_secret_key or ''
        webhook = ps.stripe_webhook_secret or ''
    except Exception:
        logger.warning('Failed to load PlatformSettings, using env vars only')
        publishable = ''
        secret = ''
        webhook = ''

    return {
        'publishable_key': publishable or getattr(settings, 'STRIPE_PUBLISHABLE_KEY', ''),
        'secret_key': secret or getattr(settings, 'STRIPE_SECRET_KEY', ''),
        'webhook_secret': webhook or getattr(settings, 'STRIPE_WEBHOOK_SECRET', ''),
    }


def get_stripe_secret_key() -> str:
    """Return the active Stripe secret key (DB → env fallback)."""
    return get_stripe_keys()['secret_key']


def get_stripe_publishable_key() -> str:
    """Return the active Stripe publishable key (DB → env fallback)."""
    return get_stripe_keys()['publishable_key']


def get_stripe_webhook_secret() -> str:
    """Return the active Stripe webhook secret (DB → env fallback)."""
    return get_stripe_keys()['webhook_secret']


def get_stripe_client(api_key: str | None = None) -> StripeClient:
    """Return a StripeClient configured with the active secret key.

    This is the preferred way to interact with Stripe in v14+.
    All new code should use this instead of configure_stripe().
    """
    key = api_key or get_stripe_secret_key()
    return StripeClient(key)


def configure_stripe():
    """Set stripe.api_key to the active secret key.

    .. deprecated::
        Use get_stripe_client() instead. This function sets global state
        which is not thread-safe. It is kept for backward compatibility only.
    """
    warnings.warn(
        "configure_stripe() is deprecated. Use get_stripe_client() instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    stripe.api_key = get_stripe_secret_key()


def mask_key(key: str) -> str:
    """Mask a Stripe key for safe display: show prefix + last 4 chars.

    Examples:
        pk_test_abc123xyz  →  pk_test_...xyz
        sk_live_abc123xyz  →  sk_live_...xyz
    """
    if not key:
        return ''
    # Find the third segment separator (pk_test_ or sk_live_)
    parts = key.split('_', 2)
    if len(parts) >= 3:
        prefix = f'{parts[0]}_{parts[1]}_'
        suffix = parts[2][-4:] if len(parts[2]) >= 4 else parts[2]
        return f'{prefix}...{suffix}'
    # Fallback: just show last 4
    return f'...{key[-4:]}' if len(key) > 4 else key


def detect_stripe_mode(secret_key: str) -> str:
    """Detect whether a key is test or live mode."""
    if not secret_key:
        return 'unconfigured'
    if secret_key.startswith('sk_test_') or secret_key.startswith('pk_test_'):
        return 'test'
    if secret_key.startswith('sk_live_') or secret_key.startswith('pk_live_'):
        return 'live'
    return 'unknown'


def validate_key_format(key: str, key_type: str) -> str | None:
    """Validate Stripe key format. Returns error message or None if valid.

    key_type: 'publishable', 'secret', or 'webhook'
    """
    if not key:
        return None  # Empty is allowed (use env var fallback)

    prefixes = {
        'publishable': ('pk_test_', 'pk_live_'),
        'secret': ('sk_test_', 'sk_live_'),
        'webhook': ('whsec_',),
    }

    valid_prefixes = prefixes.get(key_type, ())
    if valid_prefixes and not any(key.startswith(p) for p in valid_prefixes):
        expected = ' or '.join(valid_prefixes)
        return f'Invalid {key_type} key format. Must start with {expected}'

    return None


def test_stripe_connection(secret_key: str | None = None) -> dict:
    """Test Stripe API connectivity.

    Returns dict with:
        - connected: bool
        - mode: 'test' | 'live' | 'unconfigured'
        - account_name: str (if connected)
        - error: str (if not connected)
    """
    key = secret_key or get_stripe_secret_key()

    if not key:
        return {
            'connected': False,
            'mode': 'unconfigured',
            'account_name': '',
            'error': 'No Stripe secret key configured',
        }

    try:
        import stripe as stripe_module
        # Use legacy API to retrieve the current account (GET /v1/account)
        # StripeClient.accounts.retrieve() requires an account ID in SDK v14+
        account = stripe_module.Account.retrieve(api_key=key)
        return {
            'connected': True,
            'mode': detect_stripe_mode(key),
            'account_name': (
                (account.settings.dashboard.display_name
                 if account.settings and account.settings.dashboard else None)
                or (account.business_profile.name if account.business_profile else None)
                or account.email
                or ''
            ),
            'error': '',
        }
    except stripe.AuthenticationError:
        return {
            'connected': False,
            'mode': detect_stripe_mode(key),
            'account_name': '',
            'error': 'Invalid API key — authentication failed',
        }
    except stripe.StripeError as e:
        return {
            'connected': False,
            'mode': detect_stripe_mode(key),
            'account_name': '',
            'error': str(e),
        }


def sync_package_to_stripe(package, client=None):
    """Sync a JobPackage to Stripe (create/update Product + Price).

    - Creates a Stripe Product if ``stripe_product_id`` is empty or invalid.
    - Creates a new Stripe Price if ``stripe_price_id`` is empty or the
      package price has changed (Stripe Prices are immutable).
    - Archives the Stripe Product when the package is deactivated.
    """
    if client is None:
        client = get_stripe_client()

    # --- Product ---
    product = None
    if package.stripe_product_id:
        try:
            product = client.products.retrieve(package.stripe_product_id)
        except stripe.InvalidRequestError:
            product = None  # ID stored but no longer valid on Stripe

    if product is None:
        product = client.products.create(params={
            'name': package.name,
            'description': package.description or package.name,
            'metadata': {
                'package_id': str(package.id),
                'payment_type': package.payment_type,
            },
        })
        package.stripe_product_id = product.id
        package.save(update_fields=['stripe_product_id'])

    # Keep product name/description in sync
    if product.name != package.name or (product.description or '') != (package.description or ''):
        client.products.update(product.id, params={
            'name': package.name,
            'description': package.description or package.name,
        })

    # --- Price ---
    price_amount_cents = int(package.price * 100)
    currency = (package.currency or 'CAD').lower()

    need_new_price = True
    if package.stripe_price_id:
        try:
            existing_price = client.prices.retrieve(package.stripe_price_id)
            if (
                existing_price.unit_amount == price_amount_cents
                and existing_price.currency == currency
                and existing_price.active
            ):
                need_new_price = False
            else:
                # Archive old price (Stripe prices are immutable)
                try:
                    client.prices.update(package.stripe_price_id, params={'active': False})
                except stripe.StripeError:
                    pass
        except stripe.InvalidRequestError:
            pass  # Price ID invalid, create new

    if need_new_price:
        price_params = {
            'product': product.id,
            'unit_amount': price_amount_cents,
            'currency': currency,
            'metadata': {'package_id': str(package.id)},
        }

        if package.payment_type == 'subscription':
            price_params['recurring'] = {'interval': 'month'}

        new_price = client.prices.create(params=price_params)
        package.stripe_price_id = new_price.id
        package.save(update_fields=['stripe_price_id'])

    # --- Archive/unarchive product based on is_active ---
    if not package.is_active and product.active:
        client.products.update(product.id, params={'active': False})
    elif package.is_active and not product.active:
        client.products.update(product.id, params={'active': True})

    return package


def get_or_create_stripe_coupon(coupon, client=None, cart_total=None):
    """Get or create a Stripe coupon for a marketing Coupon.

    For ``percentage`` type with ``max_discount_amount``, we calculate
    the capped discount and create a ``fixed`` Stripe coupon instead
    (Stripe does not support max_discount_amount on percentage coupons).

    Returns the Stripe coupon ID string, or None for types that don't
    need a Stripe coupon (credits, free_trial).
    """
    if coupon.discount_type in ('credits', 'free_trial'):
        return None

    if client is None:
        client = get_stripe_client()

    # Check if existing Stripe coupon is still valid
    if coupon.stripe_coupon_id:
        try:
            existing = client.coupons.retrieve(coupon.stripe_coupon_id)
            if existing.valid:
                # For percentage with max_discount_amount, check if cart_total
                # changes the effective discount (it might need a fixed coupon)
                if (
                    coupon.discount_type == 'percentage'
                    and coupon.max_discount_amount
                    and cart_total is not None
                ):
                    from apps.marketing.services.coupon_service import CouponService
                    from decimal import Decimal
                    discount = CouponService.calculate_discount(coupon, cart_total)
                    uncapped = (Decimal(str(cart_total)) * coupon.discount_value) / Decimal('100')
                    if discount < uncapped:
                        # Discount was capped — need a fixed coupon for exact amount
                        pass  # Fall through to create fixed coupon
                    else:
                        return coupon.stripe_coupon_id
                else:
                    return coupon.stripe_coupon_id
        except stripe.InvalidRequestError:
            pass  # Coupon no longer exists on Stripe

    # Create new Stripe coupon
    coupon_params = {
        'duration': 'once',
        'metadata': {
            'orion_coupon_id': str(coupon.id),
            'orion_coupon_code': coupon.code,
        },
    }

    if coupon.discount_type == 'percentage' and coupon.max_discount_amount and cart_total is not None:
        # Calculate capped discount → create fixed coupon
        from apps.marketing.services.coupon_service import CouponService
        discount = CouponService.calculate_discount(coupon, cart_total)
        coupon_params['amount_off'] = int(discount * 100)
        coupon_params['currency'] = 'cad'
        coupon_params['name'] = f'{coupon.code} ({coupon.discount_value}% off, capped)'
    elif coupon.discount_type == 'percentage':
        coupon_params['percent_off'] = float(coupon.discount_value)
        coupon_params['name'] = f'{coupon.code} ({coupon.discount_value}% off)'
    elif coupon.discount_type == 'fixed':
        coupon_params['amount_off'] = int(coupon.discount_value * 100)
        coupon_params['currency'] = 'cad'
        coupon_params['name'] = f'{coupon.code} (${coupon.discount_value} off)'

    stripe_coupon = client.coupons.create(params=coupon_params)

    # Only cache the ID if it's not a cart-total-dependent fixed coupon
    if not (coupon.discount_type == 'percentage' and coupon.max_discount_amount):
        coupon.stripe_coupon_id = stripe_coupon.id
        coupon.save(update_fields=['stripe_coupon_id'])

    return stripe_coupon.id
