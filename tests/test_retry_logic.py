import pytest
import os
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.services.email_service import EmailService, email_service, EmailRecipient

def test_retry_on_connection_error():
    recipients = [
        EmailRecipient(
            email="retry.test@apex.edu",
            name="Retry Student",
            subject="Test Subject",
            html_content="<p>Test</p>",
            text_content="Test"
        )
    ]

    mock_server = MagicMock()
    # First 2 calls fail with broken pipe, 3rd call succeeds
    mock_server.send_message.side_effect = [
        ConnectionResetError("Socket dropped"),
        ConnectionResetError("Socket dropped"),
        True
    ]
    mock_server.noop.return_value = (250, b"OK")

    with patch.object(EmailService, "create_smtp_connection", return_value=(mock_server, [])):
        results = email_service.send_batch_with_connection_reuse(
            recipients=recipients,
            host="127.0.0.1",
            port=1025,
            security="none",
            username="",
            password="",
            sender_name="Apex",
            sender_email="test@apex.edu",
            max_retries=3
        )

        assert len(results) == 1
        assert results[0].success is True
        assert results[0].retry_count == 2
