"""
FastAPI application entry point.

Configures the API server with routes, middleware, and logging.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from core.database import check_db_connection
from routes import webhooks, portfolio, trades, benchmarks, ws


# Configure Loguru
logger.add(
    "logs/api.log",
    rotation="100 MB",
    retention="30 days",
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    serialize=True,  # JSON format
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting Trading Portfolio Dashboard API")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    
    # Check database connection
    if check_db_connection():
        logger.info("Database connection: OK")
    else:
        logger.error("Database connection: FAILED")
    
    yield
    
    # Shutdown
    logger.info("Shutting down API")


# Create FastAPI app
app = FastAPI(
    title="Trading Portfolio Dashboard API",
    description="Real-time trading analytics and webhook ingestion",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:5173",  # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhooks.router)
app.include_router(portfolio.router)
app.include_router(trades.router)
app.include_router(benchmarks.router)
app.include_router(ws.router)


@app.get("/healthz")
async def health_check():
    """
    Health check endpoint.
    
    Used by Docker healthcheck and load balancers.
    """
    db_healthy = check_db_connection()
    
    if db_healthy:
        return {
            "status": "healthy",
            "database": "connected",
        }
    else:
        return {
            "status": "unhealthy",
            "database": "disconnected",
        }


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Trading Portfolio Dashboard API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/healthz",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", 8000)),
        reload=True,  # Auto-reload on code changes (dev only)
        log_level="info",
    )
