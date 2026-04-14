import edge_tts
import base64
import asyncio

async def stream_tts(text_stream, voice="en-GB-RyanNeural"):
    """
    Consumes a text stream (from LLM) and yields base64 encoded audio chunks via edge-tts.
    """
    buffer = ""
    # We buffer slightly to ensure sentences are complete for better TTS quality, 
    # but still prioritize speed for low-latency.
    async for text_chunk in text_stream:
        buffer += text_chunk
        
        # If we have a punctuation mark or a reasonably long sentence, process it
        if any(punct in text_chunk for punct in ['.', '!', '?', ';', '\n']) or len(buffer) > 100:
            communicate = edge_tts.Communicate(buffer, voice)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    base64_audio = base64.b64encode(chunk["data"]).decode('utf-8')
                    yield base64_audio
            buffer = ""

    # Final sweep for remaining text
    if buffer.strip():
        communicate = edge_tts.Communicate(buffer, voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                base64_audio = base64.b64encode(chunk["data"]).decode('utf-8')
                yield base64_audio
