import subprocess
import logging

logger = logging.getLogger(__name__)

def open_application(app_name: str) -> str:
    """
    Launches a Windows application using PowerShell.
    """
    # Map common names to executable names or shell commands
    app_map = {
        "notepad": "notepad.exe",
        "calculator": "calc.exe",
        "chrome": "start chrome",
        "edge": "start msedge",
        "explorer": "explorer.exe",
        "task manager": "taskmgr.exe"
    }
    
    cmd = app_map.get(app_name.lower())
    
    if not cmd:
        # If not in map, try running as-is if it looks safe
        if " " in app_name or ";" in app_name:
            return f"Error: Command '{app_name}' looks unsafe."
        cmd = app_name

    try:
        # Use powershell to start the process
        if cmd.startswith("start "):
            subprocess.Popen(["powershell", "-Command", cmd], shell=True)
        else:
            subprocess.Popen([cmd], shell=True)
            
        logger.info(f"Successfully launched {app_name}")
        return f"Successfully opened {app_name}."
    except Exception as e:
        logger.error(f"Failed to open {app_name}: {e}")
        return f"Failed to open {app_name}. Error: {str(e)}"
