import asyncio
import json
import random
import logging
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.api.deps import get_market_data_service
from app.core.redis import cache

logger = logging.getLogger("arise.ws")
router = APIRouter(prefix="/ws", tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        # Maps symbol -> set of websockets
        self.active_subscriptions: dict[str, set[WebSocket]] = {}
        # Background task for fetching ticks
        self.worker_task: asyncio.Task | None = None

    async def subscribe(self, websocket: WebSocket, symbol: str):
        symbol = symbol.upper()
        # Unsubscribe from previous symbol if any
        self.unsubscribe(websocket)
        
        if symbol not in self.active_subscriptions:
            self.active_subscriptions[symbol] = set()
        self.active_subscriptions[symbol].add(websocket)
        logger.info(f"Client subscribed to {symbol}")
        
        # Start background loop if not running
        if not self.worker_task or self.worker_task.done():
            self.worker_task = asyncio.create_task(self._background_tick_worker())

    def unsubscribe(self, websocket: WebSocket):
        for symbol, sockets in list(self.active_subscriptions.items()):
            if websocket in sockets:
                sockets.remove(websocket)
                logger.info(f"Client unsubscribed from {symbol}")
            if not sockets:
                self.active_subscriptions.pop(symbol, None)

    async def _background_tick_worker(self):
        """Single background fetcher loop: One fetch, many consumers."""
        logger.info("Background tick worker started.")
        market_data_service = get_market_data_service()
        
        # Keep track of last prices for smooth random walks
        base_prices = {}
        anchor_prices = {}
        volumes = {}
        daily_changes = {}

        try:
            while self.active_subscriptions:
                active_symbols = list(self.active_subscriptions.keys())
                for symbol in active_symbols:
                    if symbol not in base_prices:
                        try:
                            # Fetch baseline synchronously inside threadpool to keep event loop responsive
                            quote = await asyncio.to_thread(market_data_service.get_quote, symbol)
                            base_prices[symbol] = quote.current_price or 1000.0
                            anchor_prices[symbol] = base_prices[symbol]
                            volumes[symbol] = quote.volume or 1000000
                            daily_changes[symbol] = quote.percent_change or 0.0
                        except Exception as e:
                            logger.error(f"Failed to fetch baseline for {symbol}: {e}")
                            base_prices[symbol] = 1000.0
                            anchor_prices[symbol] = 1000.0
                            volumes[symbol] = 1000000
                            daily_changes[symbol] = 0.0
                    
                    # Generate live price tick simulation
                    price = base_prices[symbol]
                    tick_change = random.uniform(-0.0004, 0.0004) * price
                    price += tick_change
                    
                    # Apply mean reversion if price drifts more than 0.75%
                    deviation = (price - anchor_prices[symbol]) / anchor_prices[symbol]
                    if abs(deviation) > 0.0075:
                        price -= 0.3 * (price - anchor_prices[symbol])
                    
                    base_prices[symbol] = price
                    prev_close = price / (1 + daily_changes[symbol] / 100) if daily_changes[symbol] else price
                    daily_change = ((price - prev_close) / prev_close) * 100
                    
                    payload = {
                        "symbol": symbol,
                        "price": round(price, 2),
                        "change": round(price - prev_close, 2),
                        "percent_change": round(daily_change, 2),
                        "volume": volumes[symbol],
                        "bid": round(price - abs(random.uniform(0.05, 0.20)), 2),
                        "ask": round(price + abs(random.uniform(0.05, 0.20)), 2),
                        "timestamp": datetime.now().isoformat(),
                    }
                    
                    # Publish to Redis channel ticks:{symbol} for scalability
                    if cache._redis and cache._redis.ping():
                        try:
                            cache._redis.publish(f"ticks:{symbol}", json.dumps(payload))
                        except Exception as e:
                            logger.error(f"Redis publish error for ticks:{symbol}: {e}")
                    
                    # Broadcast directly to all subscribed local clients
                    sockets = self.active_subscriptions.get(symbol, set())
                    disconnected_sockets = set()
                    for ws in sockets:
                        try:
                            await ws.send_text(json.dumps(payload))
                        except Exception:
                            disconnected_sockets.add(ws)
                    
                    # Cleanup disconnected clients
                    for ws in disconnected_sockets:
                        self.unsubscribe(ws)

                await asyncio.sleep(1.5)
        except Exception as e:
            logger.error(f"Background worker error: {e}")
        finally:
            logger.info("Background tick worker stopped.")


manager = ConnectionManager()


@router.websocket("/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Await subscription events
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("action") == "subscribe":
                symbol = msg.get("symbol")
                if symbol:
                    await manager.subscribe(websocket, symbol)
    except WebSocketDisconnect:
        manager.unsubscribe(websocket)
    except Exception as e:
        logger.error(f"WebSocket client error: {e}")
        manager.unsubscribe(websocket)
