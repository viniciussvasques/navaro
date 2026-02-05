import asyncio
import sys
from app.api.v1.auth import send_verification_code, SendCodeRequest
from app.core.config import settings

async def main():
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Debug Mode: {settings.is_debug}")
    
    req = SendCodeRequest(phone="+5511999999999")
    try:
        resp = await send_verification_code(req)
        print("Success:", resp)
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
