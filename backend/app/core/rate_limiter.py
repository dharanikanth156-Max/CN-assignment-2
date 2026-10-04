import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import HTTPException, status

class RateLimiter:
    def __init__(self):
        # ip or key -> list of timestamps
        self.requests: Dict[str, List[float]] = defaultdict(list)
        # Daily send counts: date_str -> count
        self.daily_sends: Dict[str, int] = defaultdict(int)
        self.minute_sends: List[float] = []

    def check_rate_limit(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        cutoff = now - window_seconds
        
        # Clean old timestamps
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]
        
        if len(self.requests[key]) >= max_requests:
            return False
            
        self.requests[key].append(now)
        return True

    def check_and_increment_send_quota(self, count: int, max_per_minute: int = 120, max_per_day: int = 5000) -> Tuple[bool, str]:
        now = time.time()
        minute_cutoff = now - 60
        today_str = time.strftime("%Y-%m-%d")
        
        # Clean minute sends
        self.minute_sends = [t for t in self.minute_sends if t > minute_cutoff]
        
        if len(self.minute_sends) + count > max_per_minute:
            return False, f"Rate limit exceeded: Max {max_per_minute} emails per minute allowed."
            
        if self.daily_sends[today_str] + count > max_per_day:
            return False, f"Daily send quota exceeded: Max {max_per_day} emails per day allowed."
            
        for _ in range(count):
            self.minute_sends.append(now)
        self.daily_sends[today_str] += count
        return True, ""

rate_limiter = RateLimiter()
