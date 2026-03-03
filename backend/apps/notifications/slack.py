"""
Slack Integration — Enterprise notification channels for Orion.

Supports two modes:
  1. OAuth App (preferred) — uses chat.postMessage with a bot token
  2. Legacy Webhooks — uses incoming webhook URLs (fallback)

Notification channels:
  - #orion-security     → Failed logins, account lockouts, fraud alerts
  - #orion-moderation   → Fraud alerts, auto-mitigations, content flags
  - #orion-billing      → Payment failures, subscription changes, refunds
  - #orion-jobs         → Job lifecycle events, application milestones
  - #orion-system       → Service health, Celery failures, RUM anomalies

Configuration resolution (DB-first, env var fallback, Redis-cached):
  1. Check PlatformSettings.slack_enabled (master switch)
  2. If SlackInstallation has an active bot token → OAuth mode
  3. Else if webhook URLs configured → legacy webhook mode
  4. Else if env vars set → env var fallback

Usage:
    from apps.notifications.slack import slack_notify, SlackChannel

    slack_notify(
        channel=SlackChannel.SECURITY,
        title="Account Lockout",
        message="user@example.com locked after 5 failed attempts",
        severity="high",
        fields={"IP": "1.2.3.4", "Location": "Unknown"},
        action_url="https://admin.orion.jobs/admin/users/123",
    )
"""
import json
import logging
from enum import Enum
from urllib.request import Request, urlopen
from urllib.error import URLError

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger('apps.notifications.slack')

SLACK_SETTINGS_CACHE_KEY = 'platform:slack_settings'
SLACK_CONFIG_CACHE_KEY = 'platform:slack_config'
SLACK_SETTINGS_CACHE_TTL = 300  # 5 minutes


class SlackChannel(str, Enum):
    """Notification channels mapped to Slack webhook URLs."""
    SECURITY = 'security'
    MODERATION = 'moderation'
    BILLING = 'billing'
    JOBS = 'jobs'
    SYSTEM = 'system'


# Severity → Slack color mapping
SEVERITY_COLORS = {
    'critical': '#DC2626',   # Red
    'high': '#F59E0B',       # Amber
    'medium': '#3B82F6',     # Blue
    'low': '#6B7280',        # Gray
    'info': '#10B981',       # Green
}

# Channel → emoji mapping
CHANNEL_EMOJI = {
    SlackChannel.SECURITY: ':shield:',
    SlackChannel.MODERATION: ':mag:',
    SlackChannel.BILLING: ':credit_card:',
    SlackChannel.JOBS: ':briefcase:',
    SlackChannel.SYSTEM: ':gear:',
}


# =============================================================================
# Configuration Resolution — DB-first, env var fallback, Redis-cached
# =============================================================================

def _get_slack_config() -> dict:
    """
    Load Slack configuration. Checks OAuth installation first, then
    falls back to legacy webhook URLs, then env vars.

    Returns dict with 'mode' key:
      - {'mode': 'none', 'enabled': False}
      - {'mode': 'oauth', 'enabled': True, 'bot_token': ..., 'channels': {...}}
      - {'mode': 'webhook', 'enabled': True, 'default': ..., ...}
    """
    cached = cache.get(SLACK_CONFIG_CACHE_KEY)
    if cached is not None:
        return cached

    result = {'mode': 'none', 'enabled': False}

    try:
        from apps.moderation.models import PlatformSettings
        ps = PlatformSettings.get_settings()

        if not ps.slack_enabled:
            cache.set(SLACK_CONFIG_CACHE_KEY, result, SLACK_SETTINGS_CACHE_TTL)
            return result

        # Try OAuth installation first
        from apps.notifications.models import SlackInstallation
        installation = SlackInstallation.get_installation()
        if installation.is_active and installation.bot_token:
            result = {
                'mode': 'oauth',
                'enabled': True,
                # bot_token is NOT cached in Redis for security — loaded fresh at send time
                'channels': {
                    'default': installation.channel_default,
                    'security': installation.channel_security,
                    'moderation': installation.channel_moderation,
                    'billing': installation.channel_billing,
                    'jobs': installation.channel_jobs,
                    'system': installation.channel_system,
                },
            }
        else:
            # Fall back to legacy webhooks from DB
            has_webhooks = bool(ps.slack_webhook_default)
            if has_webhooks:
                result = {
                    'mode': 'webhook',
                    'enabled': True,
                    'default': ps.slack_webhook_default or '',
                    'security': ps.slack_webhook_security or '',
                    'moderation': ps.slack_webhook_moderation or '',
                    'billing': ps.slack_webhook_billing or '',
                    'jobs': ps.slack_webhook_jobs or '',
                    'system': ps.slack_webhook_system or '',
                }
    except Exception:
        logger.debug('Could not load Slack config from DB, trying env vars')

    # Fall back to env vars if DB returned nothing useful
    if result['mode'] == 'none':
        env_webhooks = getattr(settings, 'SLACK_WEBHOOKS', {})
        env_enabled = getattr(settings, 'SLACK_ENABLED', False)
        if env_enabled and env_webhooks.get('default'):
            result = {
                'mode': 'webhook',
                'enabled': True,
                'default': env_webhooks.get('default', ''),
                'security': env_webhooks.get('security', ''),
                'moderation': env_webhooks.get('moderation', ''),
                'billing': env_webhooks.get('billing', ''),
                'jobs': env_webhooks.get('jobs', ''),
                'system': env_webhooks.get('system', ''),
            }

    cache.set(SLACK_CONFIG_CACHE_KEY, result, SLACK_SETTINGS_CACHE_TTL)
    return result


def _is_slack_enabled() -> bool:
    """Check if Slack notifications are enabled."""
    return _get_slack_config()['enabled']


def invalidate_slack_cache():
    """Clear cached Slack settings. Call after admin saves Slack config."""
    cache.delete(SLACK_SETTINGS_CACHE_KEY)
    cache.delete(SLACK_CONFIG_CACHE_KEY)


# =============================================================================
# Public API
# =============================================================================

def slack_notify(
    channel: SlackChannel,
    title: str,
    message: str,
    severity: str = 'info',
    fields: dict | None = None,
    action_url: str | None = None,
    mention: str | None = None,
) -> bool:
    """
    Send a notification to a Slack channel.

    Automatically routes through OAuth (chat.postMessage) or legacy webhook
    depending on the current configuration.

    Args:
        channel: Which Slack channel to send to
        title: Bold header text
        message: Main notification body
        severity: critical|high|medium|low|info — controls color
        fields: Optional dict of key-value pairs shown as fields
        action_url: Optional URL for "View Details" button
        mention: Optional Slack mention (e.g., '@channel', '@here', '<@U123>')

    Returns:
        True if sent successfully, False otherwise
    """
    config = _get_slack_config()
    if not config['enabled']:
        logger.debug('Slack notifications disabled, skipping: %s', title)
        return False

    try:
        payload = _build_payload(channel, title, message, severity, fields, action_url, mention)

        if config['mode'] == 'oauth':
            channel_id = (
                config['channels'].get(channel.value)
                or config['channels'].get('default')
            )
            if not channel_id:
                logger.warning('No Slack channel configured for: %s', channel.value)
                return False
            # Load bot token fresh from DB (not cached for security)
            from apps.notifications.models import SlackInstallation
            installation = SlackInstallation.get_installation()
            if not installation.bot_token:
                logger.warning('Slack installation has no bot token')
                return False
            return _send_chat_message(installation.bot_token, channel_id, payload)

        elif config['mode'] == 'webhook':
            webhook_url = config.get(channel.value) or config.get('default')
            if not webhook_url:
                logger.warning('No webhook URL configured for channel: %s', channel.value)
                return False
            return _send_webhook(webhook_url, payload)

        return False
    except Exception as e:
        logger.error('Slack notification failed for %s: %s', channel.value, e)
        return False


def slack_notify_async(
    channel: SlackChannel,
    title: str,
    message: str,
    severity: str = 'info',
    fields: dict | None = None,
    action_url: str | None = None,
    mention: str | None = None,
):
    """
    Fire-and-forget Slack notification via Celery.
    Use this from signal handlers and views to avoid blocking.
    """
    if not _is_slack_enabled():
        return

    try:
        from .tasks import send_slack_notification
        send_slack_notification.delay(
            channel=channel.value,
            title=title,
            message=message,
            severity=severity,
            fields=fields,
            action_url=action_url,
            mention=mention,
        )
    except Exception:
        logger.warning('Failed to queue Slack notification (broker unavailable): %s', title)


# =============================================================================
# Internal helpers
# =============================================================================

def _build_payload(
    channel: SlackChannel,
    title: str,
    message: str,
    severity: str,
    fields: dict | None,
    action_url: str | None,
    mention: str | None,
) -> dict:
    """Build Slack Block Kit payload."""
    color = SEVERITY_COLORS.get(severity, SEVERITY_COLORS['info'])
    emoji = CHANNEL_EMOJI.get(channel, ':bell:')

    # Header text with optional mention
    header = f"{emoji} *{title}*"
    if mention:
        header = f"{mention} {header}"

    # Build attachment fields
    attachment_fields = []
    if fields:
        for key, value in fields.items():
            attachment_fields.append({
                'title': key,
                'value': str(value),
                'short': len(str(value)) < 40,
            })

    # Add severity field
    attachment_fields.append({
        'title': 'Severity',
        'value': severity.upper(),
        'short': True,
    })

    # Add environment
    env = 'Production' if not getattr(settings, 'DEBUG', True) else 'Development'
    attachment_fields.append({
        'title': 'Environment',
        'value': env,
        'short': True,
    })

    # Build actions
    actions = []
    if action_url:
        actions.append({
            'type': 'button',
            'text': 'View Details',
            'url': action_url,
            'style': 'primary' if severity in ('critical', 'high') else 'default',
        })

    attachment = {
        'color': color,
        'pretext': header,
        'text': message,
        'fields': attachment_fields,
        'footer': 'Orion Platform',
        'footer_icon': 'https://orion.jobs/favicon.ico',
        'ts': __import__('time').time(),
    }

    if actions:
        attachment['actions'] = actions

    return {
        'attachments': [attachment],
    }


def _send_chat_message(bot_token: str, channel_id: str, payload: dict) -> bool:
    """Send a message via Slack chat.postMessage API (OAuth mode)."""
    body = json.dumps({**payload, 'channel': channel_id}).encode('utf-8')
    req = Request(
        'https://slack.com/api/chat.postMessage',
        data=body,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {bot_token}',
        },
        method='POST',
    )

    try:
        response = urlopen(req, timeout=10)
        data = json.loads(response.read().decode('utf-8'))
        if data.get('ok'):
            logger.info('Slack notification sent via chat.postMessage')
            return True
        logger.warning('chat.postMessage error: %s', data.get('error'))
        return False
    except URLError as e:
        logger.error('chat.postMessage request failed: %s', e)
        return False


def _send_webhook(url: str, payload: dict) -> bool:
    """Send payload to Slack webhook URL (legacy mode)."""
    data = json.dumps(payload).encode('utf-8')
    req = Request(
        url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        response = urlopen(req, timeout=10)
        if response.status == 200:
            logger.info('Slack notification sent via webhook')
            return True
        else:
            logger.warning('Slack webhook returned status %s', response.status)
            return False
    except URLError as e:
        logger.error('Slack webhook request failed: %s', e)
        return False
