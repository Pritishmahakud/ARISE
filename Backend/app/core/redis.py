import json
import logging
import time
from typing import Any
import redis
from app.core.config import settings

logger = logging.getLogger("arise.cache")

class RedisCache:
    def __init__(self):
        self._redis = None
        self._fallback_cache = {}  # In-memory backup fallback
        self._fallback_ttls = {}   # In-memory backup TTLs
        
        url = settings.redis_url
        if url:
            try:
                self._redis = redis.from_url(
                    url,
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                    socket_timeout=2.0,
                )
                self._redis.ping()
                logger.info("Redis cache initialized and connected successfully.")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Falling back to in-memory cache.")
                self._redis = None
        else:
            logger.info("No REDIS_URL configured. Using local in-memory cache.")

    def get(self, key: str) -> Any | None:
        if self._redis:
            try:
                data = self._redis.get(key)
                if data:
                    return json.loads(data)
            except Exception as e:
                logger.error(f"Redis get failed for key {key}: {e}. Falling back to in-memory.")
        
        # In-memory fallback lookup
        if key in self._fallback_cache:
            expiry = self._fallback_ttls.get(key, 0)
            if time.time() < expiry:
                return self._fallback_cache[key]
            else:
                self._fallback_cache.pop(key, None)
                self._fallback_ttls.pop(key, None)
        return None

    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        if self._redis:
            try:
                self._redis.setex(key, ttl, json.dumps(value))
                return True
            except Exception as e:
                logger.error(f"Redis set failed for key {key}: {e}. Falling back to in-memory.")
        
        # In-memory fallback insert
        self._fallback_cache[key] = value
        self._fallback_ttls[key] = time.time() + ttl
        return True

    def delete(self, key: str) -> bool:
        if self._redis:
            try:
                self._redis.delete(key)
                return True
            except Exception as e:
                logger.error(f"Redis delete failed for key {key}: {e}")
        self._fallback_cache.pop(key, None)
        self._fallback_ttls.pop(key, None)
        return True

# Singleton cache client
cache = RedisCache()
