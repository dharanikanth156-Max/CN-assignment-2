import pytest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.services.email_service import email_service
from app.core.security import sanitize_header_value, generate_unsubscribe_token, verify_unsubscribe_token

def test_build_email_message_structure():
    msg = email_service.build_email_message(
        sender_name="Apex Academic Office",
        sender_email="admin@apex.edu",
        recipient_name="Alex Mercer",
        recipient_email="alex.mercer@apex.edu",
        subject="Exam Timetable 2026",
        html_body="<h2>Exam Schedule</h2><p>Room 101</p>",
        text_body="Exam Schedule - Room 101"
    )

    assert msg["Subject"] == "Exam Timetable 2026"
    assert "Apex Academic Office" in msg["From"]
    assert "admin@apex.edu" in msg["From"]
    assert "alex.mercer@apex.edu" in msg["To"]
    assert msg["Message-ID"] is not None
    assert msg["Auto-Submitted"] == "auto-generated"
    assert msg.is_multipart()

    # Check payload parts
    payloads = msg.get_payload()
    assert len(payloads) == 2
    assert payloads[0].get_content_type() == "text/plain"
    assert payloads[1].get_content_type() == "text/html"

def test_unsubscribe_token_roundtrip():
    email = "test.student@apex.edu"
    token = generate_unsubscribe_token(email)
    assert token is not None
    verified = verify_unsubscribe_token(token)
    assert verified == email

def test_unsubscribe_invalid_token():
    assert verify_unsubscribe_token("invalid-malformed-token") is None
