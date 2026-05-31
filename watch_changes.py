import os
import time
import datetime

# Directories and files to ignore
IGNORE_DIRS = {
    ".git",
    "__pycache__",
    ".venv",
    "node_modules",
    "dist",
    "v0_template",
    ".idea",
    ".vscode",
}
IGNORE_FILES = {
    "change_history.log",
}

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(PROJECT_ROOT, "change_history.log")

def get_file_states():
    """Scan the workspace and return a mapping of relative path -> modification time."""
    states = {}
    for root, dirs, files in os.walk(PROJECT_ROOT):
        # Modifying dirs in-place filters out ignored directories recursively
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for f in files:
            if f in IGNORE_FILES:
                continue
            abs_path = os.path.join(root, f)
            rel_path = os.path.relpath(abs_path, PROJECT_ROOT)
            try:
                states[rel_path] = os.path.getmtime(abs_path)
            except OSError:
                # Handle cases where file is deleted during scan
                pass
    return states

def log_change(message):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] {message}\n"
    print(log_line.strip())
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as lf:
            lf.write(log_line)
    except OSError as e:
        print(f"Error writing to log file: {e}")

def main():
    print(f"Starting Arise Change Watcher...")
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Logging changes to: {LOG_FILE}")
    print("Press Ctrl+C to stop.")
    
    # Initial scan
    last_states = get_file_states()
    log_change("Watcher started. Initialized files state tracking.")
    
    while True:
        try:
            time.sleep(2.0)
            current_states = get_file_states()
            
            # Find added or modified files
            for rel_path, mtime in current_states.items():
                if rel_path not in last_states:
                    log_change(f"ADDED: {rel_path}")
                elif mtime > last_states[rel_path]:
                    log_change(f"MODIFIED: {rel_path}")
            
            # Find deleted files
            for rel_path in last_states:
                if rel_path not in current_states:
                    log_change(f"DELETED: {rel_path}")
            
            last_states = current_states
        except KeyboardInterrupt:
            log_change("Watcher stopped by user.")
            break
        except Exception as e:
            print(f"Error in watcher loop: {e}")
            time.sleep(5.0)

if __name__ == "__main__":
    main()
