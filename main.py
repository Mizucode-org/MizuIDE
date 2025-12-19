import webview
import os
import json
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
    
    def get_files(self):
        """Get list of files in current folder"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            files = []
            for root, dirs, filenames in os.walk(self.current_folder):
                # Calculate relative path
                rel_root = os.path.relpath(root, self.current_folder)
                if rel_root == '.':
                    rel_root = ''
                
                for filename in filenames:
                    rel_path = os.path.join(rel_root, filename) if rel_root else filename
                    files.append({
                        "name": filename,
                        "path": rel_path,
                        "full_path": os.path.join(root, filename)
                    })
            
            return {"success": True, "files": files, "folder": self.current_folder}
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
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {"success": True, "path": filepath}
        except Exception as e:
            return {"error": str(e)}
    
    def create_file(self, filename):
        """Create a new file"""
        if not self.current_folder:
            return {"error": "No folder selected"}
        
        try:
            full_path = os.path.join(self.current_folder, filename)
            if os.path.exists(full_path):
                return {"error": "File already exists"}
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write('')
            return {"success": True, "path": filename}
        except Exception as e:
            return {"error": str(e)}

html_content = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PyWebView IDE</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        
        .toolbar {
            background: #2d2d30;
            padding: 10px;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        button {
            background: #0e639c;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
        }
        
        button:hover {
            background: #1177bb;
        }
        
        .container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        .sidebar {
            width: 250px;
            background: #252526;
            border-right: 1px solid #3e3e42;
            display: flex;
            flex-direction: column;
        }
        
        .sidebar-header {
            padding: 10px;
            background: #2d2d30;
            border-bottom: 1px solid #3e3e42;
            font-weight: bold;
        }
        
        .file-list {
            flex: 1;
            overflow-y: auto;
            padding: 5px;
        }
        
        .file-item {
            padding: 8px 10px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 13px;
        }
        
        .file-item:hover {
            background: #2a2d2e;
        }
        
        .file-item.active {
            background: #094771;
        }
        
        .editor-container {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        .editor-header {
            padding: 10px;
            background: #2d2d30;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        textarea {
            flex: 1;
            background: #1e1e1e;
            color: #d4d4d4;
            border: none;
            padding: 15px;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 14px;
            resize: none;
            outline: none;
        }
        
        .welcome {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 20px;
        }
        
        .welcome h2 {
            color: #888;
        }
        
        input {
            padding: 8px;
            background: #3c3c3c;
            border: 1px solid #3e3e42;
            color: #d4d4d4;
            border-radius: 3px;
        }
        
        .status {
            padding: 5px 10px;
            background: #007acc;
            border-radius: 3px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button onclick="selectFolder()">📁 Open Folder</button>
        <button onclick="createNewFile()">➕ New File</button>
        <button onclick="saveCurrentFile()" id="saveBtn" disabled>💾 Save</button>
        <span id="folderName" style="margin-left: auto; color: #888;"></span>
    </div>
    
    <div class="container">
        <div class="sidebar">
            <div class="sidebar-header">FILES</div>
            <div class="file-list" id="fileList"></div>
        </div>
        
        <div class="editor-container">
            <div id="welcome" class="welcome">
                <h2>PyWebView IDE</h2>
                <button onclick="selectFolder()">Open a Folder to Get Started</button>
            </div>
            
            <div id="editorSection" style="display: none; flex: 1; flex-direction: column;">
                <div class="editor-header">
                    <span id="currentFile">No file open</span>
                    <span class="status" id="status"></span>
                </div>
                <textarea id="editor" placeholder="Select a file to edit..."></textarea>
            </div>
        </div>
    </div>

    <script>
        let currentFilePath = null;
        let files = [];
        
        async function selectFolder() {
            const result = await pywebview.api.select_folder();
            if (result.success) {
                document.getElementById('folderName').textContent = result.folder;
                document.getElementById('welcome').style.display = 'none';
                document.getElementById('editorSection').style.display = 'flex';
                await loadFiles();
            }
        }
        
        async function loadFiles() {
            const result = await pywebview.api.get_files();
            if (result.success) {
                files = result.files;
                displayFiles();
            } else {
                alert('Error loading files: ' + (result.error || 'Unknown error'));
            }
        }
        
        function displayFiles() {
            const fileList = document.getElementById('fileList');
            fileList.innerHTML = '';
            
            files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.textContent = file.path;
                item.onclick = () => openFile(file.path);
                fileList.appendChild(item);
            });
        }
        
        async function openFile(filepath) {
            const result = await pywebview.api.read_file(filepath);
            if (result.success) {
                currentFilePath = filepath;
                document.getElementById('editor').value = result.content;
                document.getElementById('currentFile').textContent = filepath;
                document.getElementById('saveBtn').disabled = false;
                
                // Update active state
                document.querySelectorAll('.file-item').forEach(item => {
                    item.classList.toggle('active', item.textContent === filepath);
                });
            } else {
                alert('Error opening file: ' + result.error);
            }
        }
        
        async function saveCurrentFile() {
            if (!currentFilePath) return;
            
            const content = document.getElementById('editor').value;
            const result = await pywebview.api.save_file(currentFilePath, content);
            
            if (result.success) {
                const status = document.getElementById('status');
                status.textContent = '✓ Saved';
                setTimeout(() => status.textContent = '', 2000);
            } else {
                alert('Error saving file: ' + result.error);
            }
        }
        
        async function createNewFile() {
            const filename = prompt('Enter new filename:');
            if (!filename) return;
            
            const result = await pywebview.api.create_file(filename);
            if (result.success) {
                await loadFiles();
                await openFile(filename);
            } else {
                alert('Error creating file: ' + result.error);
            }
        }
        
        // Auto-save with Ctrl+S
        document.getElementById('editor').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveCurrentFile();
            }
        });
    </script>
</body>
</html>
"""

if __name__ == '__main__':
    api = IDE_API()
    
    window = webview.create_window(
        'PyWebView IDE',
        html=html_content,
        js_api=api,
        width=1200,
        height=800
    )
    
    webview.start(debug=True)