"""
Custom Django email backend for ZeptoMail v1.1 REST API.

Replaces the abandoned django-zoho-zeptomail==0.0.3 package with a direct
API integration that is thread-safe and supports per-connection credentials.

API docs: https://www.zoho.com/zeptomail/help/api/email-sending.html
Endpoint:  POST https://api.zeptomail.com/v1.1/email
Auth:      Authorization: Zoho-enczapikey <send_mail_token>
"""
import json
import logging
from base64 import b64encode

import requests
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email"
ZEPTOMAIL_TIMEOUT = 30  # seconds


class ZeptoMailEmailBackend(BaseEmailBackend):
    """
    Django email backend that sends via the ZeptoMail v1.1 REST API.

    Usage::

        from django.core.mail import get_connection, EmailMessage

        connection = get_connection(
            backend='apps.notifications.backends.zeptomail.ZeptoMailEmailBackend',
            api_key='your-zeptomail-send-mail-token',
            fail_silently=False,
        )
        msg = EmailMessage(subject, body, from_email, [to], connection=connection)
        msg.content_subtype = 'html'
        msg.send()
    """

    def __init__(self, api_key=None, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = api_key
        self._session = None

    def open(self):
        if self._session is not None:
            return False
        self._session = requests.Session()
        self._session.headers.update({
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Zoho-enczapikey {self.api_key}",
        })
        return True

    def close(self):
        if self._session is not None:
            self._session.close()
            self._session = None

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        new_session = self.open()
        if not self._session:
            if self.fail_silently:
                return 0
            raise RuntimeError("Failed to open ZeptoMail session")

        num_sent = 0
        try:
            for message in email_messages:
                try:
                    sent = self._send(message)
                    if sent:
                        num_sent += 1
                except Exception:
                    if not self.fail_silently:
                        raise
        finally:
            if new_session:
                self.close()
        return num_sent

    def _send(self, message):
        """Send a single EmailMessage via ZeptoMail v1.1 API."""
        if not message.recipients():
            return False

        from_email, from_name = self._parse_address(message.from_email)

        payload = {
            "from": {"address": from_email, "name": from_name},
            "to": [
                {"email_address": {"address": addr, "name": ""}}
                for addr in message.to
            ],
            "subject": message.subject,
        }

        # CC / BCC
        if message.cc:
            payload["cc"] = [
                {"email_address": {"address": addr, "name": ""}}
                for addr in message.cc
            ]
        if message.bcc:
            payload["bcc"] = [
                {"email_address": {"address": addr, "name": ""}}
                for addr in message.bcc
            ]

        # Reply-To
        if message.reply_to:
            payload["reply_to"] = [
                {"address": addr, "name": ""}
                for addr in message.reply_to
            ]

        # Body — HTML or plain text
        content_subtype = getattr(message, "content_subtype", "plain")
        if content_subtype == "html":
            payload["htmlbody"] = message.body
        else:
            payload["textbody"] = message.body

        # Check alternatives for HTML
        if hasattr(message, "alternatives"):
            for content, mimetype in message.alternatives:
                if mimetype == "text/html":
                    payload["htmlbody"] = content
                    break

        # Attachments
        attachments = self._build_attachments(message)
        if attachments:
            payload["attachments"] = attachments

        response = self._session.post(
            ZEPTOMAIL_API_URL,
            data=json.dumps(payload),
            timeout=ZEPTOMAIL_TIMEOUT,
        )

        if response.status_code >= 400:
            error_detail = response.text[:500]
            logger.error(
                "ZeptoMail API error %s: %s", response.status_code, error_detail
            )
            if not self.fail_silently:
                response.raise_for_status()
            return False

        return True

    @staticmethod
    def _parse_address(from_email):
        """Parse 'Name <email@example.com>' into (email, name) tuple."""
        if "<" in from_email and ">" in from_email:
            name = from_email[: from_email.index("<")].strip().strip('"')
            email = from_email[from_email.index("<") + 1 : from_email.index(">")]
            return email, name
        return from_email, ""

    @staticmethod
    def _build_attachments(message):
        """Convert Django EmailMessage attachments to ZeptoMail format."""
        if not message.attachments:
            return []

        result = []
        for attachment in message.attachments:
            if isinstance(attachment, tuple) and len(attachment) == 3:
                filename, content, mimetype = attachment
                if isinstance(content, str):
                    content = content.encode("utf-8")
                result.append({
                    "name": filename,
                    "content": b64encode(content).decode("ascii"),
                    "mime_type": mimetype or "application/octet-stream",
                })
        return result
