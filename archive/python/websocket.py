"""
WebSocket manager for real-time dashboard updates.

Broadcasts portfolio updates, new trades, and analytics changes to connected clients.
"""

from typing import List, Dict, Set
from fastapi import WebSocket
from loguru import logger
import json
import asyncio


class ConnectionManager:
    """
    Manages WebSocket connections and broadcasts.
    """
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[str, Set[WebSocket]] = {
            "portfolio": set(),
            "trades": set(),
            "analytics": set(),
            "all": set(),
        }
    
    async def connect(self, websocket: WebSocket, channels: List[str] = None):
        """
        Accept a new WebSocket connection and subscribe to channels.
        
        Args:
            websocket: WebSocket connection
            channels: List of channels to subscribe to (default: ["all"])
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        
        if not channels:
            channels = ["all"]
        
        for channel in channels:
            if channel in self.subscriptions:
                self.subscriptions[channel].add(websocket)
        
        logger.info(f"WebSocket connected, subscribed to: {channels}")
    
    def disconnect(self, websocket: WebSocket):
        """
        Remove a WebSocket connection.
        
        Args:
            websocket: WebSocket connection to remove
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Remove from all subscriptions
        for channel_subs in self.subscriptions.values():
            if websocket in channel_subs:
                channel_subs.remove(websocket)
        
        logger.info("WebSocket disconnected")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """
        Send a message to a specific WebSocket.
        
        Args:
            message: Message dict to send
            websocket: Target WebSocket
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: dict, channel: str = "all"):
        """
        Broadcast a message to all subscribers of a channel.
        
        Args:
            message: Message dict to broadcast
            channel: Channel name (portfolio, trades, analytics, all)
        """
        if channel not in self.subscriptions:
            logger.warning(f"Unknown channel: {channel}")
            return
        
        # Get subscribers
        subscribers = self.subscriptions[channel].copy()
        
        # Also send to "all" subscribers if not already broadcasting to "all"
        if channel != "all":
            subscribers.update(self.subscriptions["all"])
        
        # Send to all subscribers
        disconnected = []
        for connection in subscribers:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
        
        logger.debug(f"Broadcasted to {len(subscribers) - len(disconnected)} clients on channel '{channel}'")
    
    async def broadcast_portfolio_update(self, data: dict):
        """
        Broadcast a portfolio update.
        
        Args:
            data: Portfolio data dict
        """
        message = {
            "type": "portfolio_update",
            "timestamp": data.get("timestamp"),
            "data": data,
        }
        await self.broadcast(message, channel="portfolio")
    
    async def broadcast_new_trade(self, trade: dict):
        """
        Broadcast a new trade event.
        
        Args:
            trade: Trade data dict
        """
        message = {
            "type": "new_trade",
            "timestamp": trade.get("time"),
            "data": trade,
        }
        await self.broadcast(message, channel="trades")
    
    async def broadcast_analytics_update(self, analytics: dict):
        """
        Broadcast analytics update.
        
        Args:
            analytics: Analytics data dict
        """
        message = {
            "type": "analytics_update",
            "timestamp": analytics.get("date"),
            "data": analytics,
        }
        await self.broadcast(message, channel="analytics")
    
    def get_connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self.active_connections)
    
    def get_subscription_counts(self) -> Dict[str, int]:
        """Get subscription counts per channel."""
        return {
            channel: len(subs)
            for channel, subs in self.subscriptions.items()
        }


# Global connection manager instance
manager = ConnectionManager()
