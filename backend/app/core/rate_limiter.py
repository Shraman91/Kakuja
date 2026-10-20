"""Async rate limiter enforcing arXiv API terms (maximum 1 request per 3 seconds)."""

import asyncio
import logging
import time

logger = logging.getLogger(__name__)


class AsyncRateLimiter:
    """Thread-safe and coroutine-safe rate limiter.

    Guarantees a minimum delay between consecutive calls to prevent API abuse.
    """

    def __init__(self, min_interval_seconds: float = 3.0):
        self.min_interval = min_interval_seconds
        self._last_call_time = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self) -> float:
        """Wait until at least `min_interval` seconds have passed since the last call.

        Returns:
            The amount of time (in seconds) waited.
        """
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_call_time
            wait_time = self.min_interval - elapsed
            if wait_time > 0:
                logger.info(
                    "Rate limit active. Waiting %.2fs before next arXiv request...",
                    wait_time,
                )
                await asyncio.sleep(wait_time)
                waited = wait_time
            else:
                waited = 0.0
            self._last_call_time = time.monotonic()
            return waited

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


# Global singleton instance for arXiv requests
arxiv_rate_limiter = AsyncRateLimiter(min_interval_seconds=3.0)
