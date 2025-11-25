"""
WebSocket routes for real-time updates.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import List
from loguru import logger

from core.websocket import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    channels: str = Query("all", description="Comma-separated list of channels to subscribe to"),
):
    """
    WebSocket endpoint for real-time updates.
    
    Channels:
    - portfolio: Portfolio overview updates
    - trades: New trade notifications
    - analytics: Analytics updates
    - all: All updates (default)
    
    Example: /ws?channels=portfolio,trades
    """
    # Parse channels
    channel_list = [c.strip() for c in channels.split(",")]
    
    await manager.connect(websocket, channels=channel_list)
    
    try:
        # Send welcome message
        await manager.send_personal_message(
            {
                "type": "connected",
                "message": "Connected to trading dashboard",
                "subscribed_channels": channel_list,
            },
            websocket
        )
        
        # Keep connection alive and handle incoming messages
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            # Handle client messages (e.g., ping/pong, subscription changes)
            if data == "ping":
                await manager.send_personal_message(
                    {"type": "pong", "message": "pong"},
                    websocket
                )
            else:
                logger.debug(f"Received message from client: {data}")
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@router.get("/ws/stats")
async def get_websocket_stats():
    """
    Get WebSocket connection statistics.
    
    Returns the number of active connections and subscriptions per channel.
    """
    return {
        "active_connections": manager.get_connection_count(),
        "subscriptions": manager.get_subscription_counts(),
    }
