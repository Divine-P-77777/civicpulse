import asyncio
import websockets

async def test():
    uri = 'ws://127.0.0.1:8000/api/live/ws/test_session'
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected successfully to", uri)
            await websocket.send('{"type":"config","language":"en"}')
            print("Sent config message")
    except Exception as e:
        print("WebSocket connection failed:", e)

if __name__ == "__main__":
    asyncio.run(test())
