import asyncio
import json
import random
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.deps import get_fno_service, get_market_data_service


router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await websocket.accept()
    subscribed_symbol = None
    market_data_service = get_market_data_service()

    base_price = 1000.0
    anchor_price = 1000.0
    base_vol = 1000000
    daily_change = 0.0

    try:
        while True:
            # Check for subscription updates from client
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                msg = json.loads(data)
                if msg.get("action") == "subscribe":
                    subscribed_symbol = msg.get("symbol", "").upper()
                    # Fetch initial baseline values
                    quote = market_data_service.get_quote(subscribed_symbol)
                    base_price = quote.current_price or 1000.0
                    anchor_price = base_price
                    base_vol = quote.volume or 1000000
                    daily_change = quote.percent_change or 0.0
            except asyncio.TimeoutError:
                # No new command, proceed with streaming updates
                pass

            if subscribed_symbol:
                # Generate random-walk simulation for live price tick
                tick_change = random.uniform(-0.0004, 0.0004) * base_price
                base_price += tick_change

                # Apply mean reversion if price drifts more than 0.75% from the anchor price
                deviation = (base_price - anchor_price) / anchor_price
                if abs(deviation) > 0.0075:
                    base_price -= 0.3 * (base_price - anchor_price)

                prev_close = base_price / (1 + daily_change / 100) if daily_change else base_price
                daily_change = ((base_price - prev_close) / prev_close) * 100

                payload = {
                    "symbol": subscribed_symbol,
                    "price": round(base_price, 2),
                    "change": round(base_price - prev_close, 2),
                    "percent_change": round(daily_change, 2),
                    "volume": base_vol,
                    "bid": round(base_price - abs(random.uniform(0.05, 0.20)), 2),
                    "ask": round(base_price + abs(random.uniform(0.05, 0.20)), 2),
                    "timestamp": datetime.now().isoformat(),
                }
                await websocket.send_text(json.dumps(payload))

            await asyncio.sleep(1.5)  # Stream updates every 1.5 seconds

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS connection error: {e}")
