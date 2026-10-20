"""Main FastAPI application entry point with lifespan events, CORS, and routing."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.repositories.job_repository import JobRepository
from app.db.session import async_session_maker, engine

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("paper_crawler")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown routines."""
    logger.info("Initializing Paper Crawler API...")

    # On startup: Mark any jobs left in progress from previous run as failed
    try:
        async with async_session_maker() as session:
            job_repo = JobRepository(session)
            reset_count = await job_repo.reset_stale_jobs()
            await session.commit()
            if reset_count > 0:
                logger.info("Reset %d stale/interrupted background jobs to 'failed'.", reset_count)
    except Exception as exc:
        logger.warning("Could not reset stale jobs on startup (DB may not be migrated yet): %s", exc)

    yield

    logger.info("Shutting down Paper Crawler API...")
    await engine.dispose()
    logger.info("Database connection engine disposed cleanly.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="arXiv paper crawler, text analyzer, semantic search, and interactive reader backend.",
    lifespan=lifespan,
)

# CORS middleware for React / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router at root and at /api for convenience
app.include_router(api_router)
app.include_router(api_router, prefix="/api")


@app.get("/", tags=["root"])
async def root():
    """Root info endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
