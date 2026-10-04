import argparse
import time
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from app.services.email_service import email_service, EmailRecipient

def run_cli_benchmark(
    recipients_count: int = 200,
    batch_size: int = 25,
    reuse_connection: bool = True,
    simulate_failures: float = 0.0,
    host: str = "127.0.0.1",
    port: int = 1025
):
    print("=" * 70)
    print("APEX UNIVERSITY SMTP LOAD & BENCHMARK SUITE")
    print("=" * 70)
    print(f"Target Server:       {host}:{port}")
    print(f"Total Recipients:    {recipients_count}")
    print(f"Batch Size:          {batch_size}")
    print(f"Connection Strategy: {'Connection Reuse (Single TCP Session per Batch)' if reuse_connection else 'Per-Message Connection'}")
    print(f"Failure Simulation:  {simulate_failures * 100:.1f}%")
    print("-" * 70)

    # Generate synthetic recipients
    recipients = [
        EmailRecipient(
            email=f"bench.student{i+1}@apex.edu",
            name=f"Student #{i+1}",
            subject=f"Load Test Message #{i+1}",
            html_content=f"<h3>Load Test Probe #{i+1}</h3><p>Automated throughput verification.</p>",
            text_content=f"Load Test Probe #{i+1}\nAutomated throughput verification."
        )
        for i in range(recipients_count)
    ]

    start_perf = time.time()
    success_count = 0
    fail_count = 0
    retry_count = 0
    latencies = []

    if reuse_connection:
        for i in range(0, len(recipients), batch_size):
            chunk = recipients[i:i + batch_size]
            results = email_service.send_batch_with_connection_reuse(
                recipients=chunk,
                host=host,
                port=port,
                security="none",
                username="",
                password="",
                sender_name="Apex Benchmark Tool",
                sender_email="benchmark@apex.edu",
                simulate_failure_rate=simulate_failures
            )
            for r in results:
                if r.success:
                    success_count += 1
                else:
                    fail_count += 1
                retry_count += r.retry_count
                latencies.append(r.latency_ms)
            print(f"Progress: {min(i + batch_size, recipients_count)} / {recipients_count} dispatched...", end="\r")
    else:
        for idx, recip in enumerate(recipients):
            t0 = time.time()
            res_success = False
            for attempt in range(3):
                try:
                    server, _ = email_service.create_smtp_connection(host, port, "none", "", "")
                    msg = email_service.build_email_message(
                        sender_name="Apex Benchmark Tool",
                        sender_email="benchmark@apex.edu",
                        recipient_name=recip.name,
                        recipient_email=recip.email,
                        subject=recip.subject,
                        html_body=recip.html_content,
                        text_body=recip.text_content
                    )
                    server.send_message(msg)
                    server.quit()
                    res_success = True
                    break
                except Exception:
                    retry_count += 1
                    time.sleep(0.05 * (2 ** attempt))

            lat = (time.time() - t0) * 1000.0
            latencies.append(lat)
            if res_success:
                success_count += 1
            else:
                fail_count += 1

            if (idx + 1) % 25 == 0 or idx == len(recipients) - 1:
                print(f"Progress: {idx + 1} / {recipients_count} dispatched...", end="\r")

    end_perf = time.time()
    total_time_ms = (end_perf - start_perf) * 1000.0
    throughput = (success_count / (total_time_ms / 1000.0)) if total_time_ms > 0 else 0.0
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0

    print("\n" + "=" * 70)
    print("BENCHMARK RESULTS")
    print("=" * 70)
    print(f"Total Sent:          {success_count} / {recipients_count} ({success_count/recipients_count*100:.1f}%)")
    print(f"Failed Count:        {fail_count}")
    print(f"Retried Attempts:    {retry_count}")
    print(f"Total Duration:      {total_time_ms:.2f} ms ({total_time_ms/1000.0:.2f} seconds)")
    print(f"Throughput:          {throughput:.2f} emails / sec")
    print(f"Average Latency:     {avg_latency:.2f} ms per recipient")
    print("=" * 70)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Apex University SMTP Load Tester")
    parser.add_argument("--recipients", type=int, default=200, help="Total number of recipients")
    parser.add_argument("--batch-size", type=int, default=25, help="Batch size for connection reuse")
    parser.add_argument("--no-reuse", action="store_true", help="Disable connection reuse (test per-connection mode)")
    parser.add_argument("--simulate-failures", type=float, default=0.0, help="Simulate failure rate (0.0 to 1.0)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="SMTP Host")
    parser.add_argument("--port", type=int, default=1025, help="SMTP Port")
    args = parser.parse_args()

    run_cli_benchmark(
        recipients_count=args.recipients,
        batch_size=args.batch_size,
        reuse_connection=not args.no_reuse,
        simulate_failures=args.simulate_failures,
        host=args.host,
        port=args.port
    )
