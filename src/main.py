import webview
import os
import sys
import subprocess
import json
import shutil
import glob
import time
import threading
from pathlib import Path
import flask
from flask import Flask, send_from_directory
from pypresence import Presence

if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

def get_app_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

app_dir = get_app_dir()

app = Flask(__name__, static_folder=None, template_folder=None)

@app.route("/theme.css")
def theme_css():
    return send_from_directory(app_dir, "styles.css")

def run_css_server():
    """This function contains ONLY the blocking Flask logic."""
    try:
        import logging
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.ERROR)
        
        app.run(
            host="127.0.0.1",
            port=8765,
            debug=False,
            use_reloader=False,
            threaded=True
        )
    except Exception as e:
        print(f"Flask Server Error: {e}")

def start_css_server():
    """This is the trigger called by the main block."""
    daemon_thread = threading.Thread(target=run_css_server, daemon=True)
    daemon_thread.start()
# Discord RPC - optional dependency

class IDE_API:
    def __init__(self):
        self.current_folder = None
        self.current_file = None
        self.clipboard_item = None  # Stores {path: relative_path, type: 'file'|'folder'}
        self.term_cwd = None
        self.active_process = None  # Store currently running process
    
    def select_folder(self):
        """Open folder selection dialog"""
        result = webview.windows[0].create_file_dialog(
            webview.FOLDER_DIALOG
        )
        if result and len(result) > 0:
            self.current_folder = result[0]
            self.term_cwd = self.current_folder # Reset terminal cwd
            return {"success": True, "folder": self.current_folder}

        return {"success": False}
    
    def terminal_run(self, command):
        """Execute terminal commands with better formatting and session support"""
        if not self.current_folder:
            return {"error": "No folder selected"}

        if not self.term_cwd:
            self.term_cwd = self.current_folder

        try:
            cmd = command.strip()
            
            # Handle 'cls' and 'clear' commands
            if cmd.lower() in ['cls', 'clear']:
                return {
                    "success": True,
                    "output": "",
                    "cwd": self.term_cwd,
                    "clear": True
                }
            
            # Handle 'exit' command
            if cmd.lower() in ['exit', 'quit']:
                return {
                    "success": True,
                    "output": "Exiting terminal...\n",
                    "cwd": self.term_cwd
                }

            # Handle cd command (built-in)
            if cmd.startswith("cd "):
                target = cmd[3:].strip().strip('"').strip("'")
                new_path = os.path.abspath(os.path.join(self.term_cwd, target))

                if os.path.isdir(new_path):
                    self.term_cwd = new_path
                    return {
                        "success": True,
                        "output": "",
                        "cwd": self.term_cwd
                    }
                else:
                    return {
                        "success": False,
                        "output": f"cd: {target}: No such directory\n",
                        "cwd": self.term_cwd,
                        "isError": True
                    }

            # Handle pwd command (built-in)
            if cmd.lower() in ['pwd', 'cd']:
                return {
                    "success": True,
                    "output": f"{self.term_cwd}\n",
                    "cwd": self.term_cwd
                }

            # Detect PowerShell properly
            shell_exe = "pwsh" if shutil.which("pwsh") else "powershell"

            # Execute command with proper output handling
            process = subprocess.Popen(
                [shell_exe, "-NoProfile", "-Command", command],
                cwd=self.term_cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            self.active_process = process
            
            # Collect output
            stdout, stderr = process.communicate(timeout=30)
            self.active_process = None
            
            output = stdout or ""
            error_output = stderr or ""

            # Format output with proper line endings
            if output and not output.endswith('\n'):
                output += '\n'
            
            return {
                "success": process.returncode == 0,
                "output": output,
                "stderr": error_output,
                "cwd": self.term_cwd,
                "returnCode": process.returncode,
                "isError": process.returncode != 0
            }

        except subprocess.TimeoutExpired:
            if self.active_process:
                self.active_process.kill()
                self.active_process = None
            return {
                "success": False,
                "output": "Command timed out (30s limit)\n",
                "cwd": self.term_cwd,
                "isError": True
            }
        except Exception as e:
            self.active_process = None
            return {
                "success": False,
                "output": f"Error: {str(e)}\n",
                "cwd": self.term_cwd,
                "isError": True
            }
    
    def terminal_cancel(self):
        """Cancel the currently running process"""
        if self.active_process:
            try:
                self.active_process.terminate()
                self.active_process = None
                return {"success": True, "output": "Process terminated\n"}
            except Exception as e:
                return {"success": False, "error": str(e)}
        
    def get_file_tree(self):
        """Get hierarchical file tree structure"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            def build_tree(path):
                items = []
                try:
                    entries = sorted(os.listdir(path))
                    for entry in entries:
                        full_path = os.path.join(path, entry)
                        rel_path = os.path.relpath(full_path, self.current_folder)
                        
                        if os.path.isdir(full_path):
                            items.append({
                                "name": entry,
                                "type": "folder",
                                "path": rel_path,
                                "children": build_tree(full_path)
                            })
                        else:
                            items.append({
                                "name": entry,
                                "type": "file",
                                "path": rel_path
                            })
                except PermissionError:
                    pass
                
                return items
            
            tree = build_tree(self.current_folder)
            return {"success": True, "tree": tree, "folder": self.current_folder}
        except Exception as e:
            return {"error": str(e)}
    
    def read_file(self, filepath):
        """Read file content"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            full_path = os.path.join(self.current_folder, filepath)
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            self.current_file = filepath
            return {"success": True, "content": content, "path": filepath}
        except Exception as e:
            return {"error": str(e)}
    
    def save_file(self, filepath, content):
        """Save file content"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            full_path = os.path.join(self.current_folder, filepath)
            
            # Security check: Prevent directory traversal
            if not os.path.abspath(full_path).startswith(os.path.abspath(self.current_folder)):
                 return {"error": "Access denied: Cannot save outside workspace"}
            
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {"success": True, "path": filepath}
        except Exception as e:
            return {"error": str(e)}

    def save_file_as(self, content):
        """Save content to a new file via dialog"""
        if not self.current_folder:
            return {"error": "No folder selected"}
            
        try:
            result = webview.windows[0].create_file_dialog(
                webview.SAVE_DIALOG,
                directory=self.current_folder,
                save_filename='untitled.txt'
            )
            
            if result:
                # Handle both string (path) and list/tuple return types
                save_path = result[0] if isinstance(result, (list, tuple)) else result
                
                if save_path:
                    with open(save_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    # If saved inside the workspace, return relative path
                    if save_path.startswith(self.current_folder):
                        rel_path = os.path.relpath(save_path, self.current_folder)
                        self.current_file = rel_path
                        return {"success": True, "path": rel_path}
                    
                    return {"success": True, "path": save_path, "outside_workspace": True}
            
            return {"cancelled": True}
        except Exception as e:
            return {"error": str(e)}
    
    def create_file(self, parent_path, filename):
        """Create a new file"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            if parent_path:
                full_path = os.path.join(self.current_folder, parent_path, filename)
            else:
                full_path = os.path.join(self.current_folder, filename)
            
            if os.path.exists(full_path):
                return {"error": "File already exists"}
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write('')
            return {"success": True}
        except Exception as e:
            return {"error": str(e)}
    
    def create_folder(self, parent_path, foldername):
        """Create a new folder"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            if parent_path:
                full_path = os.path.join(self.current_folder, parent_path, foldername)
            else:
                full_path = os.path.join(self.current_folder, foldername)
            
            if os.path.exists(full_path):
                return {"error": "Folder already exists"}
            
            os.makedirs(full_path)
            return {"success": True}
        except Exception as e:
            return {"error": str(e)}
    
    def delete_item(self, filepath):
        """Delete a file or folder"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            full_path = os.path.join(self.current_folder, filepath)
            
            if os.path.isdir(full_path):
                shutil.rmtree(full_path)
            else:
                os.remove(full_path)
            
            return {"success": True}
        except Exception as e:
            return {"error": str(e)}
    
    def copy_item(self, filepath, item_type):
        """Copy a file or folder to clipboard"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            full_path = os.path.join(self.current_folder, filepath)
            if not os.path.exists(full_path):
                return {"error": "Item does not exist"}
            
            self.clipboard_item = {
                "path": filepath,
                "type": item_type,
                "name": os.path.basename(filepath)
            }
            return {"success": True, "copied": self.clipboard_item["name"]}
        except Exception as e:
            return {"error": str(e)}
    
    def paste_item(self, target_path):
        """Paste the copied item to target location"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        if not self.clipboard_item:
            return {"error": "Nothing to paste"}
        
        try:
            source_full = os.path.join(self.current_folder, self.clipboard_item["path"])
            
            if not os.path.exists(source_full):
                return {"error": "Source item no longer exists"}
            
            # Determine destination folder
            if target_path:
                target_full = os.path.join(self.current_folder, target_path)
                if os.path.isfile(target_full):
                    # If target is a file, paste in its parent directory
                    dest_folder = os.path.dirname(target_full)
                else:
                    dest_folder = target_full
            else:
                dest_folder = self.current_folder
            
            # Generate unique name if item already exists
            base_name = self.clipboard_item["name"]
            dest_path = os.path.join(dest_folder, base_name)
            
            if os.path.exists(dest_path):
                # Generate unique name: name_copy, name_copy_2, etc.
                name_part, ext = os.path.splitext(base_name) if self.clipboard_item["type"] == "file" else (base_name, "")
                counter = 1
                while os.path.exists(dest_path):
                    if counter == 1:
                        new_name = f"{name_part}_copy{ext}"
                    else:
                        new_name = f"{name_part}_copy_{counter}{ext}"
                    dest_path = os.path.join(dest_folder, new_name)
                    counter += 1
            
            # Perform copy
            if self.clipboard_item["type"] == "folder":
                shutil.copytree(source_full, dest_path)
            else:
                shutil.copy2(source_full, dest_path)
            
            return {"success": True, "pasted": os.path.basename(dest_path)}
        except Exception as e:
            return {"error": str(e)}
    
    def rename_item(self, old_path, new_name):
        """Rename a file or folder"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            old_full_path = os.path.join(self.current_folder, old_path)
            parent_dir = os.path.dirname(old_full_path)
            new_full_path = os.path.join(parent_dir, new_name)
            
            if os.path.exists(new_full_path):
                return {"error": "Item with this name already exists"}
            
            os.rename(old_full_path, new_full_path)
            return {"success": True}
        except Exception as e:
            return {"error": str(e)}

    def reveal_item(self, filepath):
        """Reveal file or folder in system explorer"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            full_path = os.path.join(self.current_folder, filepath)
            full_path = os.path.abspath(full_path)
            
            if os.name == 'nt':  # Windows
                subprocess.run(['explorer', '/select,', full_path])
            elif sys.platform == 'darwin':  # macOS
                subprocess.run(['open', '-R', full_path])
            else:  # Linux (xdg-open opens file, doesn't necessarily select. varies)
                subprocess.run(['xdg-open', os.path.dirname(full_path)])
                
            return {"success": True}
        except Exception as e:
            return {"error": str(e)}

    def get_full_path(self, filepath):
        """Get absolute system path for a file"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            full_path = os.path.join(self.current_folder, filepath)
            return {"success": True, "path": os.path.abspath(full_path)}
        except Exception as e:
            return {"error": str(e)}


with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
    html = f.read()

if __name__ == "__main__":
    start_css_server()

    webview.create_window(
        "Mizu Code",
        os.path.join(base_dir, "index.html"),
        js_api=IDE_API(),
        width=1200,
        height=800
    )

    webview.start(debug=True)
