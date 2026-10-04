import pytest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token

def test_password_hashing_and_verification():
    raw_pwd = "SuperSecretPassword123!"
    hashed = get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_encoding_and_decoding():
    email = "admin@college.edu"
    token = create_access_token(subject=email)
    assert isinstance(token, str)
    decoded_email = decode_access_token(token)
    assert decoded_email == email

def test_jwt_token_invalid_signature():
    invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIn0.invalid_signature"
    assert decode_access_token(invalid_token) is None
