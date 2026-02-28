"""
Audience service for marketing segmentation.
Converts JSON filter rules into Django ORM querysets.
"""
from django.db.models import Q
from django.utils import timezone


class AudienceService:
    """Evaluates segment rules and resolves eligible recipients."""

    # Supported filter fields and their ORM lookups
    FIELD_MAP = {
        'role': 'role',
        'status': 'status',
        'email_verified': 'email_verified',
        'company.industry': 'company__industry',
        'company.size': 'company__size',
        'company.status': 'company__status',
        'company.billing_status': 'company__billing_status',
        'company.risk_level': 'company__risk_level',
        'agency.status': 'agency__status',
        'agency.billing_model': 'agency__billing_model',
        'consent.status': 'marketing_consent__status',
        'consent.express_consent': 'marketing_consent__express_consent',
        'created_at': 'created_at',
        'last_login': 'last_login',
    }

    # Operator to ORM lookup mapping
    OP_MAP = {
        'eq': '',            # exact match
        'neq': '',           # negated exact
        'contains': '__icontains',
        'gt': '__gt',
        'gte': '__gte',
        'lt': '__lt',
        'lte': '__lte',
        'in': '__in',
        'not_in': '__in',    # negated
        'exists': '__isnull',
        'is_null': '__isnull',
    }

    @classmethod
    def evaluate_segment_rules(cls, filter_rules):
        """
        Converts JSON filter rules into a Django Q object.

        filter_rules format:
        {
            "rules": [
                {"field": "role", "op": "eq", "value": "employer"},
                {"field": "consent.status", "op": "eq", "value": "opted_in"}
            ],
            "logic": "AND"  // or "OR"
        }

        Returns a Q object that can be applied to User.objects.filter().
        """
        from apps.users.models import User

        rules = filter_rules.get('rules', [])
        logic = filter_rules.get('logic', 'AND')

        if not rules:
            return Q()

        q_objects = []
        for rule in rules:
            field = rule.get('field', '')
            op = rule.get('op', 'eq')
            value = rule.get('value')

            orm_field = cls.FIELD_MAP.get(field)
            if orm_field is None:
                # Check for custom contact attribute
                if field.startswith('attribute.'):
                    attr_key = field.replace('attribute.', '')
                    q = Q(
                        marketing_attributes__key=attr_key,
                        marketing_attributes__value=str(value)
                    )
                    q_objects.append(q)
                    continue
                continue

            orm_lookup = cls.OP_MAP.get(op, '')
            negate = op in ('neq', 'not_in')

            # Handle special operators
            if op == 'exists':
                lookup = f'{orm_field}__isnull'
                q = Q(**{lookup: not value})
            elif op == 'is_null':
                lookup = f'{orm_field}__isnull'
                q = Q(**{lookup: value})
            else:
                lookup = f'{orm_field}{orm_lookup}'
                q = Q(**{lookup: value})

            if negate:
                q = ~q

            q_objects.append(q)

        # Combine with AND or OR logic
        if logic == 'OR':
            combined = q_objects[0]
            for q in q_objects[1:]:
                combined |= q
        else:
            combined = q_objects[0]
            for q in q_objects[1:]:
                combined &= q

        return combined

    @classmethod
    def get_segment_queryset(cls, segment):
        """
        Returns a User queryset for the given segment.
        For static segments, returns the M2M members.
        For dynamic segments, evaluates the filter rules.
        """
        from apps.users.models import User

        if segment.segment_type == 'static':
            return segment.members.all()

        q = cls.evaluate_segment_rules(segment.filter_rules)
        return User.objects.filter(q).distinct()

    @classmethod
    def get_eligible_recipients(cls, segment):
        """
        Returns users who:
        1. Are in the segment
        2. Have marketing consent opted_in
        3. Are NOT in the suppression list
        """
        from apps.marketing.models import SuppressionEntry

        users = cls.get_segment_queryset(segment)

        # Filter: must have opted-in consent
        users = users.filter(
            marketing_consent__status='opted_in'
        )

        # Exclude: suppressed emails
        suppressed_emails = SuppressionEntry.objects.values_list('email', flat=True)
        users = users.exclude(email__in=suppressed_emails)

        # Exclude: inactive/suspended users
        users = users.filter(status='active')

        return users.distinct()

    @classmethod
    def preview_segment(cls, segment, sample_size=10):
        """
        Returns estimated count and a sample of matching users.
        """
        queryset = cls.get_segment_queryset(segment)
        count = queryset.count()
        sample = queryset.order_by('?')[:sample_size].values(
            'id', 'email', 'first_name', 'last_name', 'role', 'status'
        )
        return {
            'estimated_count': count,
            'sample_users': list(sample),
        }

    @classmethod
    def compute_segment_size(cls, segment):
        """
        Computes and updates the estimated_size for a segment.
        """
        queryset = cls.get_segment_queryset(segment)
        count = queryset.count()
        segment.estimated_size = count
        segment.last_computed_at = timezone.now()
        segment.save(update_fields=['estimated_size', 'last_computed_at'])
        return count
