import asyncio
import email
from email import policy
import json
import time
import uuid
from aiosmtpd.controller import Controller
from aiosmtpd.smtp import Envelope, Session, SMTP
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

# In-memory storage for captured messages
STORED_MESSAGES = []
MAX_STORED = 2000

class MailboxHandler:
    async def handle_DATA(self, server, session: Session, envelope: Envelope):
        peer = session.peer
        mail_from = envelope.mail_from
        rcpt_tos = envelope.rcpt_tos
        content = envelope.content

        msg = email.message_from_bytes(content, policy=policy.default)
        subject = msg.get("Subject", "(No Subject)")
        from_hdr = msg.get("From", mail_from)
        to_hdr = msg.get("To", ", ".join(rcpt_tos))
        date_hdr = msg.get("Date", time.strftime("%a, %d %b %Y %H:%M:%S %z"))
        msg_id = msg.get("Message-ID", str(uuid.uuid4()))

        # Extract plain and HTML bodies
        body_text = ""
        body_html = ""

        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                cdispo = str(part.get("Content-Disposition"))
                if "attachment" not in cdispo:
                    if ctype == "text/plain" and not body_text:
                        body_text = part.get_content()
                    elif ctype == "text/html" and not body_html:
                        body_html = part.get_content()
        else:
            if msg.get_content_type() == "text/html":
                body_html = msg.get_content()
            else:
                body_text = msg.get_content()

        record = {
            "ID": str(uuid.uuid4()),
            "MessageID": msg_id,
            "From": {"Address": mail_from, "Name": from_hdr},
            "To": [{"Address": r, "Name": r} for r in rcpt_tos],
            "Subject": subject,
            "Date": date_hdr,
            "Snippet": (body_text or body_html)[:120].strip(),
            "Text": body_text,
            "HTML": body_html or f"<pre>{body_text}</pre>",
            "Size": len(content),
            "Created": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "Raw": content.decode("utf-8", errors="replace")
        }

        STORED_MESSAGES.insert(0, record)
        if len(STORED_MESSAGES) > MAX_STORED:
            STORED_MESSAGES.pop()

        print(f"[SMTP Server :1025] Received: '{subject}' -> {rcpt_tos} ({len(content)} bytes)")
        return "250 Message accepted for delivery"

class WebInboxHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/v1/messages":
            self._send_json({"total": len(STORED_MESSAGES), "messages": STORED_MESSAGES})
        elif self.path.startswith("/api/v1/message/"):
            mid = self.path.split("/")[-1]
            found = next((m for m in STORED_MESSAGES if m["ID"] == mid), None)
            if found:
                self._send_json(found)
            else:
                self._send_json({"error": "Message not found"}, 404)
        elif self.path == "/" or self.path == "/index.html":
            # Web UI Inbox
            html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Apex Mailpit Web Inbox (:8025)</title>
  <style>
    body {{ margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; height: 100vh; background: #0f172a; color: #f8fafc; }}
    #sidebar {{ width: 380px; border-right: 1px solid #334155; display: flex; flex-direction: column; background: #1e293b; }}
    #header {{ padding: 16px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }}
    #list {{ flex: 1; overflow-y: auto; }}
    .msg-item {{ padding: 14px 16px; border-bottom: 1px solid #334155; cursor: pointer; transition: background 0.15s; }}
    .msg-item:hover {{ background: #334155; }}
    .msg-item.active {{ background: #2563eb; color: #fff; }}
    .msg-subject {{ font-weight: 600; font-size: 14px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
    .msg-to {{ font-size: 12px; color: #94a3b8; }}
    #preview {{ flex: 1; display: flex; flex-direction: column; background: #0f172a; }}
    #preview-header {{ padding: 20px; border-bottom: 1px solid #334155; }}
    #preview-body {{ flex: 1; padding: 20px; overflow-y: auto; background: #ffffff; color: #1e293b; }}
    iframe {{ width: 100%; height: 100%; border: none; }}
    .badge {{ background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; }}
    button {{ background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }}
  </style>
</head>
<body>
  <div id="sidebar">
    <div id="header">
      <div><strong>📬 Local SMTP Inbox</strong> <span class="badge" id="count">{len(STORED_MESSAGES)}</span></div>
      <button onclick="clearMessages()">Clear</button>
    </div>
    <div id="list"></div>
  </div>
  <div id="preview">
    <div id="preview-header">
      <h3 id="prev-subject" style="margin:0 0 6px 0;">Select an email to inspect</h3>
      <div id="prev-meta" style="font-size:13px; color:#94a3b8;">No message selected</div>
    </div>
    <div id="preview-body">
      <iframe id="mail-frame"></iframe>
    </div>
  </div>
  <script>
    let messages = [];
    async function load() {{
      const res = await fetch('/api/v1/messages');
      const data = await res.json();
      messages = data.messages || [];
      document.getElementById('count').innerText = messages.length;
      const list = document.getElementById('list');
      list.innerHTML = '';
      messages.forEach((m, idx) => {{
        const el = document.createElement('div');
        el.className = 'msg-item';
        el.innerHTML = `<div class="msg-subject">${{m.Subject}}</div><div class="msg-to">To: ${{m.To.map(t=>t.Address).join(', ')}} &bull; ${{m.Date}}</div>`;
        el.onclick = () => selectMessage(m, el);
        list.appendChild(el);
      }});
    }}
    function selectMessage(m, el) {{
      document.querySelectorAll('.msg-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('prev-subject').innerText = m.Subject;
      document.getElementById('prev-meta').innerText = `From: ${{m.From.Name || m.From.Address}} | To: ${{m.To.map(t=>t.Address).join(', ')}} | Date: ${{m.Date}}`;
      const doc = document.getElementById('mail-frame').contentWindow.document;
      doc.open();
      doc.write(m.HTML || `<pre>${{m.Text}}</pre>`);
      doc.close();
    }}
    async function clearMessages() {{
      await fetch('/api/v1/messages', {{method: 'DELETE'}});
      load();
    }}
    load();
    setInterval(load, 2000);
  </script>
</body>
</html>"""
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode("utf-8"))
        else:
            self._send_json({"error": "Not Found"}, 404)

    def do_DELETE(self):
        if self.path == "/api/v1/messages":
            STORED_MESSAGES.clear()
            self._send_json({"success": True, "message": "Inbox cleared"})
        else:
            self._send_json({"error": "Not Found"}, 404)

def run_smtp_server():
    controller = Controller(MailboxHandler(), hostname="127.0.0.1", port=1025)
    controller.start()
    print("[SMTP Mock Server] Listening on 127.0.0.1:1025")
    return controller

def run_web_inbox():
    httpd = HTTPServer(("127.0.0.1", 8025), WebInboxHandler)
    print("[Web Inbox UI & API] Listening on http://127.0.0.1:8025")
    httpd.serve_forever()

if __name__ == "__main__":
    smtp_ctrl = run_smtp_server()
    try:
        run_web_inbox()
    except KeyboardInterrupt:
        smtp_ctrl.stop()
