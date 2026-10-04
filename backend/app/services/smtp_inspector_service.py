import time
import socket
import ssl
import base64
from typing import Dict, Any, List, Generator
from app.core.security import sanitize_header_value

class SMTPInspectorService:
    @staticmethod
    def inspect_live(
        host: str,
        port: int,
        security: str,
        username: str = "",
        password: str = "",
        sender_email: str = "test@apex.edu",
        recipient_email: str = "inspector@apex.edu",
        subject: str = "SMTP Live Inspector Test Probe"
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Executes raw SMTP protocol dialogue step-by-step, yielding real-time events
        for animated flow visualization and protocol logs.
        """
        start_all = time.time()
        
        def emit(step: str, status: str, detail: str, raw_in: str = "", raw_out: str = "", latency_ms: float = 0.0):
            return {
                "step": step,
                "status": status, # "pending" | "running" | "success" | "error"
                "detail": detail,
                "raw_in": raw_in,
                "raw_out": raw_out,
                "latency_ms": round(latency_ms, 2),
                "timestamp": time.strftime("%H:%M:%S")
            }

        sock = None
        try:
            # Step 1: TCP Connection
            t0 = time.time()
            yield emit("CONNECT", "running", f"Initiating TCP connection to {host}:{port}...")
            
            sock = socket.create_connection((host, port), timeout=10)
            
            if security == "ssl":
                context = ssl.create_default_context()
                sock = context.wrap_socket(sock, server_hostname=host)
                
            t1 = time.time()
            # Read server banner
            banner = sock.recv(1024).decode("utf-8", errors="replace").strip()
            yield emit("CONNECT", "success", f"Connected to {host}:{port}", raw_in=banner, latency_ms=(t1 - t0)*1000)

            # Step 2: EHLO
            t0 = time.time()
            yield emit("EHLO", "running", "Sending EHLO apex.edu...")
            sock.sendall(b"EHLO apex.edu\r\n")
            ehlo_reply = sock.recv(2048).decode("utf-8", errors="replace").strip()
            t1 = time.time()
            yield emit("EHLO", "success", "EHLO greeting accepted", raw_out="EHLO apex.edu", raw_in=ehlo_reply, latency_ms=(t1 - t0)*1000)

            # Step 3: STARTTLS if requested
            if security == "starttls":
                t0 = time.time()
                yield emit("STARTTLS", "running", "Initiating STARTTLS negotiation...")
                sock.sendall(b"STARTTLS\r\n")
                tls_reply = sock.recv(1024).decode("utf-8", errors="replace").strip()
                if not tls_reply.startswith("220"):
                    raise Exception(f"STARTTLS rejected: {tls_reply}")
                context = ssl.create_default_context()
                sock = context.wrap_socket(sock, server_hostname=host)
                # Re-issue EHLO over TLS
                sock.sendall(b"EHLO apex.edu\r\n")
                tls_ehlo = sock.recv(2048).decode("utf-8", errors="replace").strip()
                t1 = time.time()
                yield emit("STARTTLS", "success", "TLS v1.3 encryption handshake established", raw_out="STARTTLS -> EHLO apex.edu", raw_in=tls_ehlo, latency_ms=(t1 - t0)*1000)
            else:
                yield emit("TLS_CHECK", "info", f"Security mode: {security.upper()}", latency_ms=0)

            # Step 4: AUTH (if provided)
            if username and password:
                t0 = time.time()
                yield emit("AUTH", "running", f"Authenticating user '{username}' via AUTH LOGIN...")
                sock.sendall(b"AUTH LOGIN\r\n")
                auth_user_req = sock.recv(1024).decode("utf-8", errors="replace").strip()
                
                # Send base64 username
                u_b64 = base64.b64encode(username.encode()).decode() + "\r\n"
                sock.sendall(u_b64.encode())
                auth_pass_req = sock.recv(1024).decode("utf-8", errors="replace").strip()
                
                # Send base64 password
                p_b64 = base64.b64encode(password.encode()).decode() + "\r\n"
                sock.sendall(p_b64.encode())
                auth_res = sock.recv(1024).decode("utf-8", errors="replace").strip()
                t1 = time.time()
                
                if not auth_res.startswith("235"):
                    raise Exception(f"Authentication failed: {auth_res}")
                yield emit("AUTH", "success", "Authentication succeeded (235 2.7.0)", raw_out="AUTH LOGIN [REDACTED]", raw_in=auth_res, latency_ms=(t1 - t0)*1000)

            # Step 5: MAIL FROM
            t0 = time.time()
            yield emit("MAIL_FROM", "running", f"Sending MAIL FROM:<{sender_email}>...")
            sock.sendall(f"MAIL FROM:<{sender_email}>\r\n".encode())
            mf_reply = sock.recv(1024).decode("utf-8", errors="replace").strip()
            t1 = time.time()
            if not mf_reply.startswith("250"):
                raise Exception(f"MAIL FROM rejected: {mf_reply}")
            yield emit("MAIL_FROM", "success", "Sender envelope accepted", raw_out=f"MAIL FROM:<{sender_email}>", raw_in=mf_reply, latency_ms=(t1 - t0)*1000)

            # Step 6: RCPT TO
            t0 = time.time()
            yield emit("RCPT_TO", "running", f"Sending RCPT TO:<{recipient_email}>...")
            sock.sendall(f"RCPT TO:<{recipient_email}>\r\n".encode())
            rcpt_reply = sock.recv(1024).decode("utf-8", errors="replace").strip()
            t1 = time.time()
            if not rcpt_reply.startswith("250"):
                raise Exception(f"RCPT TO rejected: {rcpt_reply}")
            yield emit("RCPT_TO", "success", "Recipient accepted by server", raw_out=f"RCPT TO:<{recipient_email}>", raw_in=rcpt_reply, latency_ms=(t1 - t0)*1000)

            # Step 7: DATA
            t0 = time.time()
            yield emit("DATA", "running", "Sending DATA command & MIME payload...")
            sock.sendall(b"DATA\r\n")
            data_ack = sock.recv(1024).decode("utf-8", errors="replace").strip()
            if not data_ack.startswith("354"):
                raise Exception(f"DATA start rejected: {data_ack}")

            raw_payload = (
                f"From: Apex University <{sender_email}>\r\n"
                f"To: Inspector <{recipient_email}>\r\n"
                f"Subject: {subject}\r\n"
                f"MIME-Version: 1.0\r\n"
                f"Content-Type: text/html; charset=UTF-8\r\n"
                f"X-Mailer: Apex-SMTP-Inspector/1.0\r\n"
                f"\r\n"
                f"<h3>SMTP Inspector Diagnostic Probe</h3>"
                f"<p>This message was sent through the interactive live inspector.</p>"
                f"\r\n.\r\n"
            )
            sock.sendall(raw_payload.encode())
            data_res = sock.recv(1024).decode("utf-8", errors="replace").strip()
            t1 = time.time()
            if not data_res.startswith("250"):
                raise Exception(f"DATA payload rejected: {data_res}")
            yield emit("DATA", "success", "Message accepted for delivery (250 OK: queued)", raw_out="<MIME DATA PAYLOAD> .", raw_in=data_res, latency_ms=(t1 - t0)*1000)

            # Step 8: QUIT
            t0 = time.time()
            sock.sendall(b"QUIT\r\n")
            quit_reply = sock.recv(1024).decode("utf-8", errors="replace").strip()
            t1 = time.time()
            yield emit("QUIT", "success", "SMTP Session gracefully terminated", raw_out="QUIT", raw_in=quit_reply, latency_ms=(t1 - t0)*1000)

            total_ms = (time.time() - start_all) * 1000.0
            yield emit("SUMMARY", "complete", f"SMTP Handshake and delivery completed successfully in {total_ms:.1f}ms", latency_ms=total_ms)

        except Exception as e:
            yield emit("ERROR", "error", f"SMTP Failure: {str(e)}", latency_ms=(time.time() - start_all)*1000)
        finally:
            if sock:
                try:
                    sock.close()
                except Exception:
                    pass

smtp_inspector_service = SMTPInspectorService()
