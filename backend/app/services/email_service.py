import time
import uuid
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from typing import List, Optional, Tuple, Dict, Any, Callable
from dataclasses import dataclass, field

from app.core.config import settings
from app.core.security import sanitize_header_value, decrypt_secret
from app.core.logging import logger

@dataclass
class EmailRecipient:
    email: str
    name: str
    subject: str
    html_content: str
    text_content: str
    custom_headers: Dict[str, str] = field(default_factory=dict)
    log_id: Optional[int] = None
    retry_count: int = 0

@dataclass
class SendResult:
    recipient_email: str
    success: bool
    status: str # "sent" | "failed" | "retrying"
    retry_count: int
    error_message: Optional[str] = None
    latency_ms: float = 0.0
    transcript: List[Dict[str, Any]] = field(default_factory=list)

class TranscriptSMTP(smtplib.SMTP):
    """
    Custom SMTP subclass to capture raw protocol dialogue for live inspector and debug logs.
    Masks passwords and credentials automatically.
    """
    def __init__(self, *args, **kwargs):
        self.transcript: List[Dict[str, Any]] = []
        super().__init__(*args, **kwargs)

    def _record(self, direction: str, line: str):
        masked = line
        if "AUTH " in line or "auth " in line:
            masked = "AUTH [CREDENTIALS_REDACTED]"
        self.transcript.append({
            "direction": direction, # "SEND" | "RECV"
            "line": masked.strip(),
            "timestamp": time.time(),
            "time_str": time.strftime("%H:%M:%S")
        })

    def putcmd(self, cmd, args=""):
        full = f"{cmd} {args}".strip() if args else cmd
        self._record("CLIENT", full)
        return super().putcmd(cmd, args)

    def getreply(self):
        code, msg = super().getreply()
        msg_str = msg.decode("utf-8", errors="replace") if isinstance(msg, bytes) else str(msg)
        self._record("SERVER", f"{code} {msg_str}")
        return code, msg

class TranscriptSMTP_SSL(smtplib.SMTP_SSL):
    def __init__(self, *args, **kwargs):
        self.transcript: List[Dict[str, Any]] = []
        super().__init__(*args, **kwargs)

    def _record(self, direction: str, line: str):
        masked = line
        if "AUTH " in line or "auth " in line:
            masked = "AUTH [CREDENTIALS_REDACTED]"
        self.transcript.append({
            "direction": direction,
            "line": masked.strip(),
            "timestamp": time.time(),
            "time_str": time.strftime("%H:%M:%S")
        })

    def putcmd(self, cmd, args=""):
        full = f"{cmd} {args}".strip() if args else cmd
        self._record("CLIENT", full)
        return super().putcmd(cmd, args)

    def getreply(self):
        code, msg = super().getreply()
        msg_str = msg.decode("utf-8", errors="replace") if isinstance(msg, bytes) else str(msg)
        self._record("SERVER", f"{code} {msg_str}")
        return code, msg


class EmailService:
    @staticmethod
    def build_email_message(
        sender_name: str,
        sender_email: str,
        recipient_name: str,
        recipient_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        headers: Optional[Dict[str, str]] = None
    ) -> EmailMessage:
        # Sanitize headers to prevent header injection
        safe_sender_name = sanitize_header_value(sender_name)
        safe_sender_email = sanitize_header_value(sender_email)
        safe_recip_name = sanitize_header_value(recipient_name)
        safe_recip_email = sanitize_header_value(recipient_email)
        safe_subject = sanitize_header_value(subject)

        msg = EmailMessage()
        msg["Subject"] = safe_subject
        msg["From"] = f"{safe_sender_name} <{safe_sender_email}>"
        msg["To"] = f"{safe_recip_name} <{safe_recip_email}>"
        msg["Date"] = formatdate(localtime=True)
        
        # Unique RFC 2822 Message-ID
        domain = safe_sender_email.split("@")[-1] if "@" in safe_sender_email else "apex.edu"
        msg["Message-ID"] = make_msgid(domain=domain)
        
        # Standard automated notification headers
        msg["Auto-Submitted"] = "auto-generated"
        msg["X-Auto-Response-Suppress"] = "All"
        msg["Precedence"] = "bulk"

        if headers:
            for k, v in headers.items():
                safe_k = sanitize_header_value(k)
                safe_v = sanitize_header_value(v)
                msg[safe_k] = safe_v

        # Multipart/alternative payload
        msg.set_content(text_body, subtype="plain", charset="utf-8")
        msg.add_alternative(html_body, subtype="html", charset="utf-8")

        return msg

    @staticmethod
    def create_smtp_connection(
        host: str,
        port: int,
        security: str,
        username: str = "",
        password: str = "",
        timeout: int = 15,
        use_transcript: bool = False
    ) -> Tuple[smtplib.SMTP, List[Dict[str, Any]]]:
        transcript = []
        
        if security == "ssl":
            context = ssl.create_default_context()
            if use_transcript:
                server = TranscriptSMTP_SSL(host, port, timeout=timeout, context=context)
            else:
                server = smtplib.SMTP_SSL(host, port, timeout=timeout, context=context)
        else:
            if use_transcript:
                server = TranscriptSMTP(host, port, timeout=timeout)
            else:
                server = smtplib.SMTP(host, port, timeout=timeout)
                
            server.ehlo()
            if security == "starttls":
                context = ssl.create_default_context()
                server.starttls(context=context)
                server.ehlo()

        if username and password:
            server.login(username, password)

        if use_transcript and hasattr(server, "transcript"):
            transcript = server.transcript

        return server, transcript

    @classmethod
    def send_batch_with_connection_reuse(
        cls,
        recipients: List[EmailRecipient],
        host: str,
        port: int,
        security: str,
        username: str,
        password: str,
        sender_name: str,
        sender_email: str,
        max_retries: int = 3,
        simulate_failure_rate: float = 0.0,
        progress_callback: Optional[Callable[[SendResult], None]] = None
    ) -> List[SendResult]:
        """
        Sends a batch of emails reusing a single SMTP connection for high throughput.
        If connection drops, reconnects automatically.
        Retries failed recipients with backoff without failing the entire batch.
        """
        results: List[SendResult] = []
        server: Optional[smtplib.SMTP] = None

        def get_or_create_connection():
            nonlocal server
            if server is not None:
                try:
                    status = server.noop()[0]
                    if status == 250:
                        return server
                except Exception:
                    try:
                        server.quit()
                    except Exception:
                        pass
                    server = None
            server, _ = cls.create_smtp_connection(host, port, security, username, password)
            return server

        for recip in recipients:
            start_time = time.time()
            success = False
            last_err = ""
            retry_count = 0
            
            # Simulation test hooks (for test lab)
            if simulate_failure_rate > 0 and (hash(recip.email) % 100) < (simulate_failure_rate * 100):
                # Simulated failure
                latency = (time.time() - start_time) * 1000.0
                res = SendResult(
                    recipient_email=recip.email,
                    success=False,
                    status="failed",
                    retry_count=max_retries,
                    error_message="Simulated Delivery Failure (Test Lab)",
                    latency_ms=latency
                )
                results.append(res)
                if progress_callback:
                    progress_callback(res)
                continue

            for attempt in range(max_retries + 1):
                try:
                    conn = get_or_create_connection()
                    msg = cls.build_email_message(
                        sender_name=sender_name,
                        sender_email=sender_email,
                        recipient_name=recip.name,
                        recipient_email=recip.email,
                        subject=recip.subject,
                        html_body=recip.html_content,
                        text_body=recip.text_content,
                        headers=recip.custom_headers
                    )
                    conn.send_message(msg)
                    success = True
                    break
                except (smtplib.SMTPServerDisconnected, ConnectionResetError, BrokenPipeError, TimeoutError) as e:
                    last_err = f"Connection error: {str(e)}"
                    server = None # Force reconnect
                    retry_count += 1
                    time.sleep(0.1 * (2 ** attempt)) # exponential backoff
                except smtplib.SMTPRecipientsRefused as e:
                    last_err = f"Recipient refused: {str(e)}"
                    retry_count += 1
                    break # Do not retry invalid recipient addresses forever
                except smtplib.SMTPResponseException as e:
                    last_err = f"SMTP error ({e.smtp_code}): {e.smtp_error.decode('utf-8', errors='replace') if isinstance(e.smtp_error, bytes) else str(e.smtp_error)}"
                    retry_count += 1
                    time.sleep(0.1 * (2 ** attempt))
                except Exception as e:
                    last_err = f"Send error: {str(e)}"
                    retry_count += 1
                    time.sleep(0.1 * (2 ** attempt))

            latency = (time.time() - start_time) * 1000.0
            res = SendResult(
                recipient_email=recip.email,
                success=success,
                status="sent" if success else "failed",
                retry_count=retry_count,
                error_message=None if success else last_err,
                latency_ms=latency
            )
            results.append(res)
            if progress_callback:
                progress_callback(res)

        if server:
            try:
                server.quit()
            except Exception:
                pass

        return results

email_service = EmailService()
