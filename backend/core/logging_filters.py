"""
Logging filters for sensitive data masking.
Prevents accidental leakage of passwords, tokens, and API keys in log output.
"""
import logging
import re


class SensitiveDataFilter(logging.Filter):
    """Mask sensitive values in log messages."""

    PATTERNS = [
        # Key-value pairs: password=xxx, secret=xxx, token=xxx, etc.
        (re.compile(
            r'(password|passwd|secret|token|api_key|apikey|authorization|credential)'
            r'\s*[=:]\s*\S+',
            re.IGNORECASE,
        ), r'\1=***'),
        # Stripe keys and webhook secrets
        (re.compile(r'(sk_live_|sk_test_|whsec_|rk_live_|rk_test_)\w+'), '***REDACTED***'),
        # Resend API keys
        (re.compile(r'(re_live_|re_test_)\w+'), '***REDACTED***'),
    ]

    def filter(self, record):
        if isinstance(record.msg, str):
            for pattern, replacement in self.PATTERNS:
                record.msg = pattern.sub(replacement, record.msg)
        if record.args and isinstance(record.args, tuple):
            new_args = []
            for arg in record.args:
                if isinstance(arg, str):
                    for pattern, replacement in self.PATTERNS:
                        arg = pattern.sub(replacement, arg)
                new_args.append(arg)
            record.args = tuple(new_args)
        return True
