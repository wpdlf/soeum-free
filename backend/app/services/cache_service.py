import redis.asyncio as aioredis
from typing import Awaitable, Callable


class CacheService:
    def __init__(self, redis: aioredis.Redis):
        self._redis = redis

    async def get(self, key: str) -> str | None:
        return await self._redis.get(key)

    async def set(self, key: str, value: str, ttl: int = 300) -> None:
        await self._redis.setex(key, ttl, value)

    async def delete(self, key: str) -> None:
        await self._redis.delete(key)

    async def invalidate_pattern(self, pattern: str) -> int:
        deleted = 0
        async for key in self._redis.scan_iter(match=pattern, count=100):
            await self._redis.delete(key)
            deleted += 1
        return deleted

    async def get_or_set(
        self,
        key: str,
        factory: Callable[[], Awaitable[str]],
        ttl: int = 300,
    ) -> str:
        cached = await self.get(key)
        if cached is not None:
            return cached
        value = await factory()
        await self.set(key, value, ttl)
        return value
