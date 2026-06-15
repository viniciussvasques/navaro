import asyncio
import sys
import os

# Ensure app is in path
sys.path.append("/app")

from app.core.redis import get_redis
from app.core.config import settings

async def main():
    print(f"--- REDIS DEBUG ---")
    print(f"URL: {settings.REDIS_URL}")
    print(f"Prefix: {settings.REDIS_PREFIX}")
    
    try:
        r = await get_redis()
        
        # Test Key
        test_key = "debug:connectivity"
        await r.setex(test_key, 60, "ok")
        print(f"Set key: {test_key} -> ok")
        
        val = await r.get(test_key)
        print(f"Get key: {test_key} -> {val}")
        
        # List OTP keys
        search_pattern = f"{settings.REDIS_PREFIX}otp:*"
        print(f"Searching for keys matching: {search_pattern}")
        keys = await r.keys(search_pattern)
        print(f"Found {len(keys)} keys:")
        for k in keys:
            v = await r.get(k)
            ttl = await r.ttl(k)
            print(f"Key: {k} | Val: {v} | TTL: {ttl}s")
            
        await r.aclose()
        
    except Exception as e:
        print(f"ERROR: {e}")
    print("--- END ---")

if __name__ == "__main__":
    asyncio.run(main())
