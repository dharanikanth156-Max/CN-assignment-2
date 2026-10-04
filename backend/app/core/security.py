import re
import base64
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError
from cryptography.fernet import Fernet
import bleach
from app.core.config import settings
import bcrypt

# Ensure valid 32-byte urlsafe base64 key for Fernet
def get_fernet_cipher() -> Fernet:
    key = settings.FERNET_KEY.encode()
    if len(key) != 44:
        # derive a 32-byte key
        digest = hashlib.sha256(key).digest()
        key = base64.urlsafe_b64encode(digest)
    return Fernet(key)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

def encrypt_secret(secret_text: str) -> str:
    if not secret_text:
        return ""
    cipher = get_fernet_cipher()
    return cipher.encrypt(secret_text.encode("utf-8")).decode("utf-8")

def decrypt_secret(encrypted_text: str) -> str:
    if not encrypted_text:
        return ""
    try:
        cipher = get_fernet_cipher()
        return cipher.decrypt(encrypted_text.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""

def sanitize_header_value(value: str) -> str:
    """
    Prevents SMTP Header Injection.
    Rejects or strips CR (\r), LF (\n), %0A, %0D, and non-printable control characters.
    """
    if not value:
        return ""
    if "\r" in value or "\n" in value or "\0" in value:
        raise ValueError("CR/LF or null byte detected in email header field - possible header injection attempt.")
    # Extra check for URL-encoded equivalents
    if re.search(r"%0[adAD]", value):
        raise ValueError("Encoded line break detected in email header field.")
    return value.strip()

def sanitize_html_content(raw_html: str) -> str:
    """
    Sanitizes HTML content allowed in announcements/emails.
    """
    if not raw_html:
        return ""
    allowed_tags = [
        'a', 'abbr', 'b', 'blockquote', 'code', 'em', 'i', 'li', 'ol', 'p', 'strong',
        'ul', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div', 'br', 'hr', 'img'
    ]
    allowed_attributes = {
        '*': ['class', 'style'],
        'a': ['href', 'title', 'target', 'rel'],
        'img': ['src', 'alt', 'width', 'height'],
        'td': ['colspan', 'rowspan', 'align'],
        'th': ['colspan', 'rowspan', 'align']
    }
    allowed_styles = [
        'color', 'background-color', 'font-size', 'font-weight', 'text-align',
        'padding', 'margin', 'border', 'border-collapse', 'width', 'height', 'line-height'
    ]
    cleaned = bleach.clean(
        raw_html,
        tags=allowed_tags,
        attributes=allowed_attributes,
        styles=allowed_styles,
        strip=True
    )
    return cleaned

def generate_unsubscribe_token(email: str) -> str:
    """
    Generates a secure HMAC-signed token for one-click unsubscribe links.
    """
    msg = f"{email}:{settings.UNSUBSCRIBE_SECRET}".encode("utf-8")
    sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    payload = f"{email}:{sig}"
    return base64.urlsafe_b64encode(payload.encode("utf-8")).decode("utf-8")

def verify_unsubscribe_token(token: str) -> Optional[str]:
    try:
        decoded = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        parts = decoded.rsplit(":", 1)
        if len(parts) != 2:
            return None
        email, sig = parts
        expected_token = generate_unsubscribe_token(email)
        if hmac.compare_digest(token, expected_token):
            return email
        return None
    except Exception:
        return None
