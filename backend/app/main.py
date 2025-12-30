"""
EU Voice Companion - FastAPI Backend

A GDPR-compliant voice companion platform for elderly care,
using Twilio Media Streams and OpenAI Realtime API.
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import people, dashboard, twilio_webhook


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    # Startup
    print("Starting EU Voice Companion Backend...")
    await init_db()
    print("Database initialized")
    
    # Start background cleanup scheduler (simplified for MVP)
    cleanup_task = asyncio.create_task(run_daily_cleanup())
    
    yield
    
    # Shutdown
    cleanup_task.cancel()
    print("Shutting down...")


app = FastAPI(
    title="EU Voice Companion",
    description="GDPR-compliant voice companion platform for elderly care",
    version="0.1.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(people.router)
app.include_router(dashboard.router)
app.include_router(twilio_webhook.router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "EU Voice Companion",
        "gdpr_compliant": True,
        "eu_hosting_required": settings.EU_HOSTING_ONLY
    }


@app.get("/health")
async def health():
    """Health check for monitoring."""
    return {"status": "healthy"}


async def run_daily_cleanup():
    """Background task that runs retention cleanup daily."""
    from app.database import async_session_maker
    from app import crud
    
    while True:
        try:
            # Wait 24 hours
            await asyncio.sleep(86400)
            
            async with async_session_maker() as db:
                result = await crud.cleanup_expired_data(db)
                print(f"Daily cleanup: {result}")
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Cleanup error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

