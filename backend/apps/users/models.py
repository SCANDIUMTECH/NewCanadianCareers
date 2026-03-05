"""
User models for Orion.
"""
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone

from core.encryption import EncryptedTextField
from core.utils import generate_entity_id


class UserManager(BaseUserManager):
    """Custom user manager for Orion users."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom user model for Orion."""

    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('employer', 'Employer'),
        ('agency', 'Agency'),
        ('candidate', 'Candidate'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('pending', 'Pending Verification'),
    ]

    # Remove username field, use email instead
    username = None
    email = models.EmailField('email address', unique=True)

    # Public identifier
    entity_id = models.CharField(
        max_length=10,
        unique=True,
        editable=False,
        blank=True,
        db_index=True,
        help_text='Unique 8-character alphanumeric identifier (generated on save)',
    )

    # Role and status
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='candidate')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Profile
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True)
    resume = models.FileField(upload_to='resumes/', null=True, blank=True)
    resume_filename = models.CharField(max_length=255, blank=True)

    # Privacy settings (for candidates)
    profile_visible = models.BooleanField(default=True)
    show_email = models.BooleanField(default=False)
    show_phone = models.BooleanField(default=False)
    searchable = models.BooleanField(default=True)
    allow_recruiter_contact = models.BooleanField(default=True)

    # Relationships
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )
    agency = models.ForeignKey(
        'companies.Agency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )

    # Marketing roles
    is_marketing_admin = models.BooleanField(default=False)
    is_marketing_analyst = models.BooleanField(default=False)

    # Security
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = EncryptedTextField(blank=True, default='')

    # Security - Account Lockout
    failed_login_attempts = models.PositiveIntegerField(default=0)
    last_failed_login = models.DateTimeField(null=True, blank=True)
    locked_until = models.DateTimeField(null=True, blank=True)
    security_email_enabled = models.BooleanField(default=True)

    # Email verification
    email_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    onboarding_completed = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['status']),
            models.Index(fields=['company']),
            models.Index(fields=['agency']),
        ]

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        if not self.entity_id:
            for _ in range(10):
                candidate = generate_entity_id()
                if not User.objects.filter(entity_id=candidate).exists():
                    self.entity_id = candidate
                    break
            else:
                self.entity_id = generate_entity_id(10)
        super().save(*args, **kwargs)

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip() or self.email

    def verify_email(self):
        """Mark user's email as verified."""
        self.email_verified = True
        self.email_verified_at = timezone.now()
        if self.status == 'pending':
            self.status = 'active'
        self.save(update_fields=['email_verified', 'email_verified_at', 'status'])


class UserSession(models.Model):
    """Track user sessions for security and analytics."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=40, db_index=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    device_type = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    last_activity = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_sessions'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f'{self.user.email} - {self.ip_address}'

    def is_expired(self):
        return timezone.now() > self.expires_at


class PasswordResetToken(models.Model):
    """Store password reset tokens."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'password_reset_tokens'

    def is_valid(self):
        return self.used_at is None and timezone.now() < self.expires_at


class EmailVerificationToken(models.Model):
    """Store email verification tokens."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verification_tokens')
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'email_verification_tokens'

    def is_valid(self):
        return self.used_at is None and timezone.now() < self.expires_at


class LoginCode(models.Model):
    """One-time login codes sent via email."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    attempts = models.IntegerField(default=0)

    class Meta:
        db_table = 'login_codes'
        indexes = [
            models.Index(fields=['user', 'code']),
        ]

    def is_valid(self):
        return (
            self.used_at is None
            and self.attempts < 5
            and timezone.now() < self.expires_at
        )
