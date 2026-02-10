import json
import asyncio
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.api.deps import AdminUser
from app.core.logging import broadcaster

router = APIRouter()

@router.get("/stream")
async def stream_logs(admin: AdminUser):
    # ... (no changes to stream_logs)
    async def log_generator():
        try:
            async for event in broadcaster.subscribe():
                yield f"data: {json.dumps(event)}\n\n"
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        log_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
        }
    )

@router.post("/test")
async def trigger_test_log(admin: AdminUser):
    """Trigger a test log message to verify broadcasting."""
    from app.core.logging import get_logger
    logger = get_logger("app.admin.logs")
    logger.info("TEST: Evento de log disparado manualmente via painel admin.")
    return {"message": "Log disparado com sucesso."}
