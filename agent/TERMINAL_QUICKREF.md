# MizuIDE Terminal - Quick Reference Card

## 🎮 Terminal Keyboard Shortcuts

```
↑ / ↓         Navigate command history
Enter         Execute current command
Tab           Command/path completion
Ctrl + C      Clear input line
Ctrl + L      Clear entire terminal (bash-style)
Delete        Delete character under cursor
Ctrl + A      (Native) Move to start of line
Ctrl + E      (Native) Move to end of line
Ctrl + U      (Native) Clear from cursor to start
```

## 📝 Terminal Commands

### Navigation
```bash
cd path                 # Change directory
cd ..                   # Go up one level
cd ~                    # Go to home
pwd                     # Print working directory
```

### Terminal Control
```bash
cls                     # Clear terminal (Windows)
clear                   # Clear terminal (Linux/Mac)
exit                    # Exit terminal
quit                    # Quit terminal
```

### File Operations
```bash
dir                     # List directory (Windows)
ls                      # List directory (Linux/Mac)
mkdir folder_name       # Create folder
del file_name           # Delete file
copy file dest          # Copy file
move file dest          # Move file
```

### Running Scripts
```bash
python script.py        # Run Python script
node script.js          # Run Node script
npm start               # Run npm command
py -m pip install pkg   # Install Python package
```

## 🎨 Output Formatting

### Command Input
- Displayed in **cyan** (#61dafb)
- Shows command prompt before text
- Example: `PS C:\Users\username >  python test.py`

### Success Output
- Displayed in **gray** (#a6acaf)
- Normal text color for regular output
- Proper line wrapping

### Error Output
- Displayed in **red** (#ff7b72)
- Highlighted for visibility
- Includes stderr from failed commands

### Code Blocks
- Text within backticks formatted as code
- Monospace font with background
- Example: `` `print("hello")` ``

## 💾 Terminal Features

### Session History
- Command history accessible with ↑↓ arrows
- History survives while terminal is open
- Cleared only when running `cls` or `clear`
- Max 500 lines before auto-trimming oldest

### Working Directory
- Shows in prompt: `PS C:\current\path >`
- Long paths truncated with ... prefix
- Updated automatically after `cd` commands
- Persists across multiple commands

### Process Management
- Commands executed in PowerShell
- 30-second timeout for long operations
- Ctrl+C clears input without terminating process
- Auto-cleanup on completion

## 🔍 Common Tasks

### Navigate and List Files
```bash
cd projects              # Change to projects folder
dir                      # List all files
cd src                   # Go into src folder
```

### Run Python Script
```bash
python script.py         # Execute script
# Output appears in gray
# Errors appear in red
```

### Change Directory Back
```bash
cd ..                    # Up one level
cd ../..                 # Up two levels
cd C:\path\to\folder     # Absolute path
```

### Clear History and Restart
```bash
cls                      # Clear terminal
# Fresh start, history cleared
```

## ⚡ Pro Tips

1. **Fast History Navigation**
   - Press ↑ multiple times to jump through recent commands
   - Current command shown after each press

2. **Clear on Demand**
   - Use `cls` command to clear visible output
   - Or `Ctrl+L` for bash-style clear
   - Terminal history removed completely

3. **Error Debugging**
   - Red text indicates errors
   - Errors separated from normal output
   - Scroll up to see complete error messages

4. **Long Paths**
   - Paths over 40 chars truncated with `...`
   - Full path still active (just shortened for display)
   - Use `pwd` to see complete directory

5. **Code Viewing**
   - Output with backticks gets formatted
   - Easier to read code blocks
   - Monospace font for clarity

## 🐛 Troubleshooting

### Command Hangs
- Wait up to 30 seconds (timeout limit)
- Command will terminate automatically
- Try pressing Ctrl+C to clear input

### Terminal Unresponsive
- Terminal should always be responsive
- If frozen, close and reopen IDE
- All command history preserved

### Can't Change Directory
- Verify path exists: `dir C:\path\to\check`
- Use quotes for paths with spaces: `cd "My Folder"`
- Use double backslash or forward slash: `C:\\Users\\Name`

### Output Not Showing
- Check command executed (prompt + command shown)
- Scroll terminal to see output
- Some commands have no output (like `cd`)

## 📊 Terminal Information

- **Font**: Consolas, Monaco, Courier New (monospace)
- **Font Size**: 13px
- **Line Height**: 1.5
- **Max Lines**: 500 (auto-trims oldest)
- **Timeout**: 30 seconds per command
- **Shell**: PowerShell (pwsh) or fallback to powershell

## 🎯 Next Steps

1. Open MizuIDE application
2. Select workspace folder
3. Click terminal area or press to focus
4. Start typing commands
5. Use shortcuts for efficiency
6. Review formatted output

---

**Created**: December 24, 2025
**Version**: 1.0
**Status**: Production Ready ✅
