import logging
import sys
import re

class CredentialMaskingFormatter(logging.Formatter):
    """
    Formatter that strips passwords, tokens, and sensitive auth data from log messages.
    """
    PATTERNS = [
        (re.compile(r'(password|passwd|pwd|secret|token|fernet_key|auth)=["\']?([^"\'\s&,]+)["\']?', re.IGNORECASE), r'\1=***REDACTED***'),
        (re.compile(r'AUTH\s+(LOGIN|PLAIN)\s+[A-Za-z0-9+/=]+', re.IGNORECASE), r'AUTH \1 ***REDACTED_BASE64***'),
        (re.compile(r'Bearer\s+[A-Za-z0-9\-_.]+', re.IGNORECASE), r'Bearer ***REDACTED_JWT***'),
    ]

    def format(self, record: logging.LogRecord) -> str:
        orig = super().format(record)
        for pattern, replacement in self.PATTERNS:
            orig = pattern.sub(replacement, orig)
        return orig

def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    formatter = CredentialMaskingFormatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers = [handler]
    
    # Silence noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("passlib").setLevel(logging.ERROR)

logger = logging.getLogger("college_email")
