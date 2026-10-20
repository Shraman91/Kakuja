"""Unit tests for the centralized asynchronous rate limiter."""

import asyncio
import time

import pytest

from app.core.rate_limiter import AsyncRateLimiter


@pytest.mark.asyncio
async def test_rate_limiter_spacing():
    """Verify that multiple concurrent acquisitions are spaced by the minimum interval."""
    # Use a small interval for fast unit testing
    interval = 0.15
    limiter = AsyncRateLimiter(min_interval_seconds=interval)

    call_times = []

    async def worker():
        await limiter.acquire()
        call_times.append(time.monotonic())

    # Launch 3 concurrent workers simultaneously
    start = time.monotonic()
    await asyncio.gather(worker(), worker(), worker())
    total_elapsed = time.monotonic() - start

    assert len(call_times) == 3
    # Total elapsed should be at least (3 - 1) * interval
    expected_min = 2 * interval * 0.9  # 10% tolerance for system clock
    assert total_elapsed >= expected_min, f"Elapsed {total_elapsed} was less than {expected_min}"

    # Verify spacing between consecutive calls
    for i in range(1, len(call_times)):
        spacing = call_times[i] - call_times[i - 1]
        assert spacing >= interval * 0.85, f"Spacing {spacing} was less than interval {interval}"
