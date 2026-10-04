import pytest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.security import sanitize_header_value

def test_header_injection_crlf_rejection():
    # Attempt to inject BCC header
    malicious_subject = "Urgent Notice\r\nBcc: hacker@external.com"
    with pytest.raises(ValueError, match="CR/LF or null byte detected"):
        sanitize_header_value(malicious_subject)

def test_header_injection_lf_only_rejection():
    malicious_subject = "Important Update\nSubject: Spoofed"
    with pytest.raises(ValueError, match="CR/LF or null byte detected"):
        sanitize_header_value(malicious_subject)

def test_header_injection_url_encoded_rejection():
    malicious = "Subject%0ABcc:all@apex.edu"
    with pytest.raises(ValueError, match="Encoded line break detected"):
        sanitize_header_value(malicious)

def test_valid_header_sanitization():
    valid = "   Final Examination Schedule - Spring 2026   "
    clean = sanitize_header_value(valid)
    assert clean == "Final Examination Schedule - Spring 2026"
