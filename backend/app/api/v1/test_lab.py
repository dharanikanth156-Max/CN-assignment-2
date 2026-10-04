import time
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db, SyncSessionLocal
from app.models.student import Student
from app.models.smtp_config import TestRun, SMTPConfig
from app.models.user import User
from app.schemas.smtp_config import TestLabGenerateRequest, TestLabRunRequest, TestRunResponse
from app.services.email_service import email_service, EmailRecipient
from app.services.campaign_service import campaign_service
from app.api.deps import get_current_admin

router = APIRouter(prefix="/test-lab", tags=["Test Lab"])

FIRST_NAMES = ["Aarav", "Aditi", "Rohan", "Priya", "Ananya", "Vikram", "Neha", "Rahul", "Pooja", "Karthik", "Sneha", "Arjun", "Divya", "Sanjay", "Meera"]
LAST_NAMES = ["Sharma", "Verma", "Patel", "Reddy", "Iyer", "Nair", "Gupta", "Rao", "Kumar", "Singh", "Das", "Joshi", "Bhat", "Mehta"]
DEPTS = ["CS", "ECE", "MECH", "CIVIL", "MBA"]

@router.post("/generate-dummy-students")
async def generate_dummy_students(
    payload: TestLabGenerateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    count = min(max(payload.count, 1), 2000)
    existing_rolls = set((await db.execute(select(Student.roll_no))).scalars().all())
    existing_emails = set((await db.execute(select(Student.email))).scalars().all())

    new_students = []
    generated = 0
    attempts = 0

    while generated < count and attempts < count * 5:
        attempts += 1
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        name = f"{fn} {ln}"
        dept = payload.department if payload.department and payload.department != "ALL" else random.choice(DEPTS)
        year = payload.year if payload.year and payload.year > 0 else random.randint(1, 4)
        roll_num = random.randint(10000, 99999)
        roll_no = f"{dept}2026-{roll_num}"
        email = f"{fn.lower()}.{ln.lower()}{roll_num}@apex.edu"

        if roll_no in existing_rolls or email in existing_emails:
            continue

        existing_rolls.add(roll_no)
        existing_emails.add(email)

        student = Student(
            roll_no=roll_no,
            name=name,
            email=email,
            department=dept,
            year=year,
            subscribed=True
        )
        new_students.append(student)
        generated += 1

    if new_students:
        db.add_all(new_students)
        await db.commit()

    return {
        "success": True,
        "message": f"Successfully generated {len(new_students)} realistic dummy students.",
        "generated_count": len(new_students)
    }

@router.post("/run-benchmark", response_model=TestRunResponse)
async def run_benchmark(
    payload: TestLabRunRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Fetch test recipients
    students = (await db.execute(select(Student).limit(payload.recipient_count))).scalars().all()
    if len(students) < payload.recipient_count:
        # If not enough students, auto-generate more
        needed = payload.recipient_count - len(students)
        await generate_dummy_students(TestLabGenerateRequest(count=needed), db, admin)
        students = (await db.execute(select(Student).limit(payload.recipient_count))).scalars().all()

    s_db = SyncSessionLocal()
    try:
        host, port, security, username, password, sender_name, sender_email = campaign_service.get_smtp_credentials(s_db)
    finally:
        s_db.close()

    recipients = [
        EmailRecipient(
            email=s.email,
            name=s.name,
            subject=f"Benchmark Test Message: {payload.run_name}",
            html_content=f"<h3>Apex University Benchmark Test</h3><p>Recipient: {s.name} ({s.roll_no})</p><p>Batch Size: {payload.batch_size} | Connection Reuse: {payload.reuse_connection}</p>",
            text_content=f"Apex University Benchmark Test\nRecipient: {s.name} ({s.roll_no})"
        )
        for s in students
    ]

    total_recipients = len(recipients)
    success_count = 0
    fail_count = 0
    retry_count = 0
    latencies = []

    start_perf = time.time()

    if payload.reuse_connection:
        # Connection reuse mode (batched)
        batch_sz = max(payload.batch_size, 1)
        for i in range(0, total_recipients, batch_sz):
            chunk = recipients[i:i + batch_sz]
            results = email_service.send_batch_with_connection_reuse(
                recipients=chunk,
                host=host,
                port=port,
                security=security,
                username=username,
                password=password,
                sender_name=sender_name,
                sender_email=sender_email,
                simulate_failure_rate=payload.simulate_failure_rate
            )
            for r in results:
                if r.success:
                    success_count += 1
                else:
                    fail_count += 1
                retry_count += r.retry_count
                latencies.append(r.latency_ms)
    else:
        # Per-connection mode (creates a fresh TCP & SMTP handshake for each individual email)
        for recip in recipients:
            t0 = time.time()
            res_success = False
            r_count = 0
            
            # Simulation hook
            if payload.simulate_failure_rate > 0 and (hash(recip.email) % 100) < (payload.simulate_failure_rate * 100):
                fail_count += 1
                retry_count += 3
                latencies.append((time.time() - t0) * 1000.0)
                continue

            for attempt in range(4):
                try:
                    server, _ = email_service.create_smtp_connection(host, port, security, username, password)
                    msg = email_service.build_email_message(
                        sender_name=sender_name,
                        sender_email=sender_email,
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
                    r_count += 1
                    time.sleep(0.05 * (2 ** attempt))

            lat = (time.time() - t0) * 1000.0
            latencies.append(lat)
            if res_success:
                success_count += 1
            else:
                fail_count += 1
            retry_count += r_count

    end_perf = time.time()
    total_time_ms = (end_perf - start_perf) * 1000.0
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    throughput = (success_count / (total_time_ms / 1000.0)) if total_time_ms > 0 else 0.0

    test_run = TestRun(
        run_name=payload.run_name,
        recipient_count=total_recipients,
        batch_size=payload.batch_size if payload.reuse_connection else 1,
        reuse_connection=payload.reuse_connection,
        simulate_failure_rate=payload.simulate_failure_rate,
        total_time_ms=round(total_time_ms, 2),
        throughput_eps=round(throughput, 2),
        avg_latency_ms=round(avg_latency, 2),
        success_count=success_count,
        fail_count=fail_count,
        retry_count=retry_count
    )
    db.add(test_run)
    await db.commit()
    await db.refresh(test_run)

    return test_run

@router.get("/runs", response_model=List[TestRunResponse])
async def get_test_runs(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(TestRun).order_by(TestRun.id.desc()).limit(20))
    return result.scalars().all()
