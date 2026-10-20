"""Master API router aggregating all route handlers."""

from fastapi import APIRouter

from app.api.endpoints import crawl, health, jobs, papers

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(papers.router)
api_router.include_router(jobs.router)
api_router.include_router(crawl.router)
