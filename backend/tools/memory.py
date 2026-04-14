import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def save_note(content: str) -> str:
    """
    Appends a timestamped note to jarvis_notes.md.
    """
    file_path = "jarvis_notes.md"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(f"## {timestamp}\n{content}\n\n")
        
        logger.info(f"Saved note to {file_path}")
        return f"Successfully saved the note to {file_path}."
    except Exception as e:
        logger.error(f"Failed to save note: {e}")
        return f"Failed to save note. Error: {str(e)}"
