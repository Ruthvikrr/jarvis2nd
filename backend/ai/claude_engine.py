import os
import json
import logging
from anthropic import AsyncAnthropic, AuthenticationError
from dotenv import load_dotenv

# Import tools
from tools.windows_sys import open_application
from tools.memory import save_note

load_dotenv()
logger = logging.getLogger(__name__)

api_key = os.getenv("ANTHROPIC_API_KEY")

# VERIFICATION LOG
if not api_key or api_key == "your_key_here":
    print("\n" + "!"*60)
    print(" CRITICAL ERROR: ANTHROPIC_API_KEY IS MISSING OR INVALID ")
    print(" Please check your backend/.env file and paste your key. ")
    print("!"*60 + "\n")
else:
    print(f"--- JARVIS AI Engine Initialized (Key detected: {api_key[:8]}...) ---")

client = AsyncAnthropic(api_key=api_key)

TOOLS = [
    {
        "name": "open_application",
        "description": "Opens a Windows application like Notepad, Calculator, Chrome, or Edge.",
        "input_schema": {
            "type": "object",
            "properties": {
                "app_name": {"type": "string", "description": "The name of the application (e.g., 'notepad')."}
            },
            "required": ["app_name"]
        }
    },
    {
        "name": "save_note",
        "description": "Saves a text note to a local file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content": {"type": "string", "description": "The text to save."}
            },
            "required": ["content"]
        }
    }
]

async def stream_claude_response(text: str):
    system_prompt = (
        "You are JARVIS, a highly intelligent AI assistant. Be concise and professional. "
        "Use your Windows tools when asked. Confirm actions briefly."
    )
    messages = [{"role": "user", "content": text}]
    
    try:
        response = await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
            tools=TOOLS,
            stream=True
        )

        tool_calls = []
        current_tool_call = None
        
        async for event in response:
            if event.type == "content_block_start":
                if event.content_block.type == "tool_use":
                    current_tool_call = {"id": event.content_block.id, "name": event.content_block.name, "input": ""}
            elif event.type == "content_block_delta":
                if event.delta.type == "text_delta":
                    yield event.delta.text
                elif event.delta.type == "input_json_delta":
                    current_tool_call["input"] += event.delta.partial_json
            elif event.type == "content_block_stop":
                if current_tool_call:
                    current_tool_call["input"] = json.loads(current_tool_call["input"])
                    tool_calls.append(current_tool_call)
                    current_tool_call = None

        if tool_calls:
            assistant_content = []
            for tc in tool_calls:
                assistant_content.append({"type": "tool_use", "id": tc["id"], "name": tc["name"], "input": tc["input"]})
            messages.append({"role": "assistant", "content": assistant_content})

            for tc in tool_calls:
                result = open_application(tc["input"]["app_name"]) if tc["name"] == "open_application" else save_note(tc["input"]["content"])
                messages.append({"role": "user", "content": [{"type": "tool_result", "tool_use_id": tc["id"], "content": result}]})

            final_response = await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
                tools=TOOLS,
                stream=True
            )
            async for event in final_response:
                if event.type == "content_block_delta" and event.delta.type == "text_delta":
                    yield event.delta.text

    except AuthenticationError:
        yield "Sir, my apologies, but the Anthropic API key provided is invalid. Please check your credentials."
    except Exception as e:
        logger.error(f"Claude Error: {e}")
        yield f"Sir, I encountered an internal error: {str(e)}"
