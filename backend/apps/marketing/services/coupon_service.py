"""
Coupon & store credit business logic.
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from apps.audit.models import create_audit_log
from ..models import Coupon, CouponRedemption, StoreCreditWallet, StoreCreditTransaction


class CouponService:
    """Handles coupon validation, redemption, and store credit operations."""

    @staticmethod
    def validate_coupon(code, user, cart_total=None, package_ids=None, ip_address=None):
        """
        Full eligibility check for a coupon.
        Returns (is_valid: bool, coupon_or_none, error_message: str).
        """
        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            return False, None, 'Coupon not found.'

        if not coupon.is_valid:
            return False, None, 'This coupon is no longer valid.'

        # Check per-customer limit
        user_redemptions = CouponRedemption.objects.filter(
            coupon=coupon, user=user
        ).count()
        if user_redemptions >= coupon.max_uses_per_customer:
            return False, None, 'You have already used this coupon.'

        # Check IP restriction
        if coupon.one_per_ip and ip_address:
            ip_used = CouponRedemption.objects.filter(
                coupon=coupon, ip_address=ip_address
            ).exists()
            if ip_used:
                return False, None, 'This coupon has already been used.'

        # Check verified email requirement
        if coupon.require_verified_email and not user.email_verified:
            return False, None, 'Email verification required to use this coupon.'

        # Check minimum purchase
        if coupon.min_purchase and cart_total is not None:
            if Decimal(str(cart_total)) < coupon.min_purchase:
                return False, None, f'Minimum purchase of ${coupon.min_purchase} required.'

        # Check applicable packages
        if package_ids and coupon.applicable_packages.exists():
            applicable = set(coupon.applicable_packages.values_list('id', flat=True))
            if not set(package_ids) & applicable:
                return False, None, 'This coupon does not apply to the selected packages.'

        # Check eligibility rules
        rules = coupon.eligibility_rules or {}
        if rules.get('roles'):
            if user.role not in rules['roles']:
                return False, None, 'This coupon is not available for your account type.'

        if rules.get('min_account_age_days'):
            days_since = (timezone.now() - user.date_joined).days
            if days_since < rules['min_account_age_days']:
                return False, None, 'Your account is too new to use this coupon.'

        return True, coupon, ''

    @staticmethod
    def calculate_discount(coupon, cart_total):
        """Calculate the discount amount for a given cart total."""
        if coupon.discount_type == 'percentage':
            discount = (Decimal(str(cart_total)) * coupon.discount_value) / Decimal('100')
            if coupon.max_discount_amount:
                discount = min(discount, coupon.max_discount_amount)
            return discount
        elif coupon.discount_type == 'fixed':
            return min(coupon.discount_value, Decimal(str(cart_total)))
        return Decimal('0')

    @staticmethod
    @transaction.atomic
    def redeem_coupon(coupon, user, invoice=None, ip_address=None, user_agent=''):
        """
        Atomically redeem a coupon. Increments usage count and creates redemption record.
        """
        discount_amount = Decimal('0')
        credits_granted = 0

        if coupon.discount_type == 'credits':
            credits_granted = int(coupon.discount_value)
        elif invoice:
            discount_amount = CouponService.calculate_discount(
                coupon, invoice.amount
            )

        # Atomically increment usage with select_for_update to prevent race
        from django.db.models import F
        coupon = type(coupon).objects.select_for_update().get(id=coupon.id)
        if coupon.max_uses_total and coupon.uses_count >= coupon.max_uses_total:
            raise ValueError('Coupon has reached maximum usage limit')
        type(coupon).objects.filter(id=coupon.id).update(
            uses_count=F('uses_count') + 1
        )
        coupon.refresh_from_db()
        if coupon.max_uses_total and coupon.uses_count >= coupon.max_uses_total:
            type(coupon).objects.filter(id=coupon.id).update(status='exhausted')
            coupon.refresh_from_db()

        redemption = CouponRedemption.objects.create(
            coupon=coupon,
            user=user,
            company=getattr(user, 'company', None),
            agency=getattr(user, 'agency', None),
            invoice=invoice,
            discount_amount=discount_amount,
            credits_granted=credits_granted,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return redemption

    @staticmethod
    @transaction.atomic
    def issue_store_credit(wallet, amount, description, coupon=None, admin=None):
        """Credit a store credit wallet."""
        amount = Decimal(str(amount))
        wallet.balance += amount
        wallet.save(update_fields=['balance', 'updated_at'])

        txn = StoreCreditTransaction.objects.create(
            wallet=wallet,
            transaction_type='credit',
            amount=amount,
            balance_after=wallet.balance,
            description=description,
            coupon=coupon,
            admin=admin,
        )
        return txn

    @staticmethod
    @transaction.atomic
    def debit_store_credit(wallet, amount, description, invoice=None):
        """Debit from a store credit wallet with balance check."""
        amount = Decimal(str(amount))
        if wallet.balance < amount:
            raise ValueError(
                f'Insufficient store credit. Balance: ${wallet.balance}, required: ${amount}'
            )

        wallet.balance -= amount
        wallet.save(update_fields=['balance', 'updated_at'])

        txn = StoreCreditTransaction.objects.create(
            wallet=wallet,
            transaction_type='debit',
            amount=amount,
            balance_after=wallet.balance,
            description=description,
            invoice=invoice,
        )
        return txn

    @staticmethod
    def get_or_create_wallet(company=None, agency=None):
        """Get or create a store credit wallet."""
        if company:
            wallet, _ = StoreCreditWallet.objects.get_or_create(
                company=company, defaults={'balance': Decimal('0')}
            )
        elif agency:
            wallet, _ = StoreCreditWallet.objects.get_or_create(
                agency=agency, defaults={'balance': Decimal('0')}
            )
        else:
            raise ValueError('Either company or agency must be provided.')
        return wallet

    @staticmethod
    @transaction.atomic
    def duplicate_coupon(coupon, actor=None):
        """Create a copy of a coupon in active status with a new code."""
        import random
        import string

        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        new_code = f'{coupon.code}-{suffix}'

        new_coupon = Coupon.objects.create(
            name=f'{coupon.name} (Copy)',
            code=new_code,
            description=coupon.description,
            discount_type=coupon.discount_type,
            discount_value=coupon.discount_value,
            max_discount_amount=coupon.max_discount_amount,
            distribution=coupon.distribution,
            status='active',
            min_purchase=coupon.min_purchase,
            max_uses_total=coupon.max_uses_total,
            max_uses_per_customer=coupon.max_uses_per_customer,
            eligibility_rules=coupon.eligibility_rules,
            starts_at=coupon.starts_at,
            expires_at=coupon.expires_at,
            one_per_ip=coupon.one_per_ip,
            require_verified_email=coupon.require_verified_email,
            created_by=actor,
        )

        # Copy applicable packages
        new_coupon.applicable_packages.set(coupon.applicable_packages.all())

        return new_coupon
