from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import time
import json
import logging
from ai.claude_engine import stream_claude_response
from tts.edge_engine import stream_tts

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware to prevent connection issues from browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Voice Infrastructure Backend - Phase 4.5"}

@app.websocket("/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected to voice websocket")
    
    try:
        while True:
            data_raw = await websocket.receive_text()
            data = json.loads(data_raw)
            
            client_type = data.get("type", "audio")
            client_timestamp = data.get("timestamp", time.time() * 1000)
            
            if client_type == "text":
                user_text = data.get("text", "")
                logger.info(f"Received text input: {user_text}")
                
                # Pipe: Text -> Claude -> TTS -> WebSocket
                claude_stream = stream_claude_response(user_text)
                async for audio_chunk in stream_tts(claude_stream):
                    await websocket.send_json({
                        "type": "audio_chunk",
                        "audio": audio_chunk,
                        "timestamp": time.time() * 1000
                    })
                
                # Signal end of stream
                await websocket.send_json({"type": "stream_end"})
                
            else:
                # Echo/Log for latency
                await websocket.send_json({
                    "status": "received",
                    "client_timestamp": client_timestamp,
                    "server_received": time.time() * 1000
                })
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        logger.info("Client disconnected")
