import asyncio
import concurrent.futures
import time
from typing import Callable, Any
from app.core.config import settings
from app.core.logging import logger

class AsyncWorkerPool:
    def __init__(self, max_workers: int = 4):
        self.executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix="smtp-worker"
        )

    def submit(self, fn: Callable, *args, **kwargs) -> concurrent.futures.Future:
        return self.executor.submit(fn, *args, **kwargs)

    async def run_in_pool(self, fn: Callable, *args, **kwargs) -> Any:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self.executor, lambda: fn(*args, **kwargs))

    def shutdown(self):
        self.executor.shutdown(wait=False)

worker_pool = AsyncWorkerPool(max_workers=settings.SMTP_MAX_WORKERS)
