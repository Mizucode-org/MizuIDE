import webview
import os
import json
import shutil
from pathlib import Path

class IDE_API:
    def __init__(self):
        self.current_folder = None
        self.current_file = None
    
    def select_folder(self):
        """Open folder selection dialog"""
        result = webview.windows[0].create_file_dialog(
            webview.FOLDER_DIALOG
        )
        if result and len(result) > 0:
            self.current_folder = result[0]
            return {"success": True, "folder": self.current_folder}
        return {"success": False}
    
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


with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

if __name__ == '__main__':
    api = IDE_API()
    
    window = webview.create_window(
        'Mizu Code',
        html=html,
        js_api=api,
        width=1200,
        height=800
    )
    
    webview.start(debug=True)