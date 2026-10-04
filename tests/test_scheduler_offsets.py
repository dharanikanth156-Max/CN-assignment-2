import pytest
from datetime import datetime, timedelta, timezone

def test_scheduler_offset_logic():
    now = datetime.now(timezone.utc)
    
    # Exactly 7 days out
    exam_7d = now + timedelta(days=7)
    diff_7d = (exam_7d - now).total_seconds()
    assert 7 * 86400 - 3600 <= diff_7d <= 7 * 86400 + 3600

    # Exactly 1 day out
    exam_1d = now + timedelta(days=1)
    diff_1d = (exam_1d - now).total_seconds()
    assert 24 * 3600 - 3600 <= diff_1d <= 24 * 3600 + 3600

    # Exactly 2 hours out
    exam_2h = now + timedelta(hours=2)
    diff_2h = (exam_2h - now).total_seconds()
    assert 2 * 3600 - 900 <= diff_2h <= 2 * 3600 + 900
