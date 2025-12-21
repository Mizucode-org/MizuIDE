        // ==================== PERFORMANCE OPTIMIZATIONS ====================
        // 1. Cached DOM references (avoid repeated getElementById calls)
        // 2. Debounced syntax highlighting (reduces CPU usage on typing)
        // 3. Throttled scroll sync
        // 4. Limited terminal output (prevents memory bloat)
        // 5. Optimized HTML escaping (reuse single element)
        // 6. Event delegation for file tree (fewer event listeners)
        // ====================================================================

        // === Cached DOM References (fetched once) ===
        const DOM = {
            editor: null,
            syntaxHighlight: null,
            termOutput: null,
            termInput: null,
            termPrompt: null,
            termContent: null,
            fileTree: null,
            tabsContainer: null,
            contextMenu: null,
            currentFile: null,
            saveBtn: null,
            status: null,
            folderName: null,
            welcome: null,
            editorSection: null,
            sidebar: null,
            resizer: null,
            termResizer: null,
            terminalSection: null,
            customModal: null,
            modalTitle: null,
            modalMessage: null,
            modalInput: null,
            modalConfirmBtn: null,
            commandPalette: null,
            commandPaletteInput: null,
            commandPaletteList: null,
            themeStylesheet: null
        };

        // Initialize DOM cache after page load
        function initDOMCache() {
            DOM.editor = document.getElementById('editor');
            DOM.syntaxHighlight = document.getElementById('syntaxHighlight');
            DOM.termOutput = document.getElementById('termOutput');
            DOM.termInput = document.getElementById('termInput');
            DOM.termPrompt = document.getElementById('termPrompt');
            DOM.termContent = document.getElementById('termContent');
            DOM.fileTree = document.getElementById('fileTree');
            DOM.tabsContainer = document.getElementById('tabsContainer');
            DOM.contextMenu = document.getElementById('contextMenu');
            DOM.currentFile = document.getElementById('currentFile');
            DOM.saveBtn = document.getElementById('saveBtn');
            DOM.status = document.getElementById('status');
            DOM.folderName = document.getElementById('folderName');
            DOM.welcome = document.getElementById('welcome');
            DOM.editorSection = document.getElementById('editorSection');
            DOM.sidebar = document.getElementById('sidebar');
            DOM.resizer = document.getElementById('resizer');
            DOM.termResizer = document.getElementById('termResizer');
            DOM.terminalSection = document.getElementById('terminalSection');
            DOM.customModal = document.getElementById('customModal');
            DOM.modalTitle = document.getElementById('modalTitle');
            DOM.modalMessage = document.getElementById('modalMessage');
            DOM.modalInput = document.getElementById('modalInput');
            DOM.modalConfirmBtn = document.getElementById('modalConfirmBtn');
            DOM.commandPalette = document.getElementById('commandPalette');
            DOM.commandPaletteInput = document.getElementById('commandPaletteInput');
            DOM.commandPaletteList = document.getElementById('commandPaletteList');
            DOM.themeStylesheet = document.getElementById('themeStylesheet');
        }

        // === Debounce utility ===
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // === Throttle utility ===
        function throttle(func, limit) {
            let inThrottle;
            return function (...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }

        // === Optimized HTML escaping (reuse single element) ===
        const escapeDiv = document.createElement('div');
        function escapeHtml(text) {
            escapeDiv.textContent = text;
            return escapeDiv.innerHTML;
        }

        // === State Variables ===
        let currentFilePath = null;
        let fileTree = [];
        let contextTarget = null;
        let collapsedFolders = new Set();
        let openTabs = [];
        let tabContents = {};
        let workspaceFolder = null;
        let termHistory = [];
        let termHistoryIndex = -1;
        let modalResolve = null;
        let isResizing = false;
        let isTermResizing = false;

        // === Command Palette State ===
        let commandPaletteOpen = false;
        let commandPaletteMode = 'commands'; // 'commands' or 'themes'
        let commandPaletteSelectedIndex = 0;
        let discordRpcEnabled = true;
        let currentTheme = 'styles.css';

        // === Terminal Output Limiter ===
        const MAX_TERMINAL_LINES = 500;
        function trimTerminalOutput() {
            if (DOM.termOutput && DOM.termOutput.children.length > MAX_TERMINAL_LINES) {
                const excess = DOM.termOutput.children.length - MAX_TERMINAL_LINES;
                for (let i = 0; i < excess; i++) {
                    DOM.termOutput.removeChild(DOM.termOutput.firstChild);
                }
            }
        }

        function appendToTerminal(text, isCommand, isError = false) {
            const line = document.createElement('div');
            if (isCommand) {
                const promptText = DOM.termPrompt.textContent;
                line.style.color = '#cccccc';
                line.innerHTML = `<span style="color: #dbd9d9; font-weight: bold; margin-right: 8px;">${promptText}</span>${escapeHtml(text)}`;
            } else {
                line.textContent = text;
                if (isError) line.style.color = '#f48771';
            }
            DOM.termOutput.appendChild(line);
            trimTerminalOutput();
        }

        function clearTerminal() {
            DOM.termOutput.innerHTML = '';
        }

        // ==================== COMMAND PALETTE ====================

        // Load saved theme on startup (using backend config file)
        async function loadSavedTheme() {
            try {
                const result = await pywebview.api.get_saved_theme();
                if (result.success && result.theme) {
                    currentTheme = result.theme;
                    if (result.theme !== 'styles.css') {
                        applyTheme(result.theme, false); // Don't save again
                    }
                }
            } catch (e) {
                console.log('Could not load saved theme, using default');
                currentTheme = 'styles.css';
            }
        }

        async function applyTheme(filename, save = true) {
            currentTheme = filename;
            if (DOM.themeStylesheet) {
                // Add cache-busting parameter to force reload
                const timestamp = new Date().getTime();
                DOM.themeStylesheet.href = filename + '?t=' + timestamp;
            }

            // Save to backend config file
            if (save) {
                try {
                    await pywebview.api.save_theme(filename);
                } catch (e) {
                    console.log('Could not save theme setting');
                }
            }
            console.log('Theme applied:', filename);
        }

        // Command definitions
        const COMMANDS = [
            {
                id: 'reload',
                icon: 'fa-rotate-right',
                label: 'Reload Window',
                shortcut: 'Ctrl+Shift+R',
                category: 'View',
                action: () => location.reload()
            },
            {
                id: 'discord_toggle',
                icon: 'fa-gamepad',
                label: 'Toggle Discord Rich Presence',
                shortcut: '',
                category: 'Preferences',
                action: toggleDiscordRpc,
                getBadge: () => discordRpcEnabled ? { text: 'ON', class: '' } : { text: 'OFF', class: 'off' }
            },
            {
                id: 'new_file',
                icon: 'fa-file-circle-plus',
                label: 'New File',
                shortcut: '',
                category: 'File',
                action: () => { closeCommandPalette(); contextTarget = null; contextAction('newFile'); }
            },
            {
                id: 'new_folder',
                icon: 'fa-folder-plus',
                label: 'New Folder',
                shortcut: '',
                category: 'File',
                action: () => { closeCommandPalette(); contextTarget = null; contextAction('newFolder'); }
            },
            {
                id: 'save',
                icon: 'fa-floppy-disk',
                label: 'Save File',
                shortcut: 'Ctrl+S',
                category: 'File',
                action: () => { closeCommandPalette(); saveCurrentFile(); }
            },
            {
                id: 'open_workspace',
                icon: 'fa-folder-open',
                label: 'Open Workspace',
                shortcut: '',
                category: 'File',
                action: () => { closeCommandPalette(); selectFolder(); }
            },
            {
                id: 'clear_terminal',
                icon: 'fa-ban',
                label: 'Clear Terminal',
                shortcut: '',
                category: 'Terminal',
                action: () => { closeCommandPalette(); clearTerminal(); }
            }
        ];

        function openCommandPalette() {
            commandPaletteMode = 'commands';
            commandPaletteSelectedIndex = 0;
            commandPaletteOpen = true;
            DOM.commandPalette.style.display = 'flex';
            DOM.commandPaletteInput.value = '';
            DOM.commandPaletteInput.placeholder = 'Type a command...';
            renderCommandList('');
            DOM.commandPaletteInput.focus();
        }

        function closeCommandPalette() {
            commandPaletteOpen = false;
            DOM.commandPalette.style.display = 'none';
            DOM.commandPaletteInput.value = '';
        }

        function renderCommandList(filter) {
            const list = DOM.commandPaletteList;
            list.innerHTML = '';

            if (commandPaletteMode === 'commands') {
                const filtered = COMMANDS.filter(cmd =>
                    cmd.label.toLowerCase().includes(filter.toLowerCase()) ||
                    cmd.category.toLowerCase().includes(filter.toLowerCase())
                );

                if (filtered.length === 0) {
                    list.innerHTML = '<div class="command-palette-empty">No matching commands</div>';
                    return;
                }

                // Group by category
                const grouped = {};
                filtered.forEach(cmd => {
                    if (!grouped[cmd.category]) grouped[cmd.category] = [];
                    grouped[cmd.category].push(cmd);
                });

                let index = 0;
                Object.keys(grouped).sort().forEach(category => {
                    const catDiv = document.createElement('div');
                    catDiv.className = 'command-palette-category';
                    catDiv.textContent = category;
                    list.appendChild(catDiv);

                    grouped[category].forEach(cmd => {
                        const item = document.createElement('div');
                        item.className = 'command-palette-item';
                        item.dataset.index = index;
                        if (index === commandPaletteSelectedIndex) item.classList.add('selected');

                        let badgeHtml = '';
                        if (cmd.getBadge) {
                            const badge = cmd.getBadge();
                            badgeHtml = `<span class="command-palette-item-badge ${badge.class}">${badge.text}</span>`;
                        }

                        item.innerHTML = `
                            <span class="command-palette-item-icon"><i class="fas ${cmd.icon}"></i></span>
                            <span class="command-palette-item-text">${escapeHtml(cmd.label)}</span>
                            ${badgeHtml}
                            ${cmd.shortcut ? `<span class="command-palette-item-shortcut">${cmd.shortcut}</span>` : ''}
                        `;
                        item.addEventListener('click', () => executeCommand(cmd));
                        item.addEventListener('mouseenter', () => {
                            commandPaletteSelectedIndex = parseInt(item.dataset.index);
                            updateSelectedItem();
                        });
                        list.appendChild(item);
                        index++;
                    });
                });
            } else if (commandPaletteMode === 'themes') {
                renderThemeList(filter);
            }
        }

        async function renderThemeList(filter) {
            const list = DOM.commandPaletteList;
            list.innerHTML = '<div class="command-palette-empty">Loading themes...</div>';

            try {
                const result = await pywebview.api.get_available_themes();
                if (!result.success) {
                    list.innerHTML = '<div class="command-palette-empty">Error loading themes</div>';
                    return;
                }

                const themes = result.themes.filter(t =>
                    t.displayName.toLowerCase().includes(filter.toLowerCase()) ||
                    t.filename.toLowerCase().includes(filter.toLowerCase())
                );

                list.innerHTML = '';

                if (themes.length === 0) {
                    list.innerHTML = '<div class="command-palette-empty">No matching themes</div>';
                    return;
                }

                const catDiv = document.createElement('div');
                catDiv.className = 'command-palette-category';
                catDiv.textContent = 'Themes';
                list.appendChild(catDiv);

                themes.forEach((theme, index) => {
                    const item = document.createElement('div');
                    item.className = 'command-palette-item';
                    item.dataset.index = index;
                    if (index === commandPaletteSelectedIndex) item.classList.add('selected');

                    const isActive = theme.filename === currentTheme;
                    const badgeHtml = isActive ? '<span class="command-palette-item-badge">ACTIVE</span>' : '';
                    const defaultBadge = theme.isDefault ? '<span class="command-palette-item-badge off">DEFAULT</span>' : '';

                    item.innerHTML = `
                        <span class="command-palette-item-icon"><i class="fas fa-brush"></i></span>
                        <span class="command-palette-item-text">${escapeHtml(theme.displayName)}</span>
                        ${badgeHtml}${defaultBadge}
                    `;
                    item.addEventListener('click', () => selectTheme(theme.filename));
                    item.addEventListener('mouseenter', () => {
                        commandPaletteSelectedIndex = index;
                        updateSelectedItem();
                    });
                    list.appendChild(item);
                });
            } catch (e) {
                list.innerHTML = '<div class="command-palette-empty">Error: ' + e.message + '</div>';
            }
        }

        function updateSelectedItem() {
            const items = DOM.commandPaletteList.querySelectorAll('.command-palette-item');
            items.forEach((item, i) => {
                item.classList.toggle('selected', i === commandPaletteSelectedIndex);
            });
        }

        function executeCommand(cmd) {
            closeCommandPalette();
            if (cmd.action) cmd.action();
        }

        function executeSelectedCommand() {
            const items = DOM.commandPaletteList.querySelectorAll('.command-palette-item');
            if (items.length > 0 && commandPaletteSelectedIndex < items.length) {
                items[commandPaletteSelectedIndex].click();
            }
        }

        function showThemeSelector() {
            commandPaletteMode = 'themes';
            commandPaletteSelectedIndex = 0;
            DOM.commandPaletteInput.value = '';
            DOM.commandPaletteInput.placeholder = 'Select a theme...';
            renderThemeList('');
        }

        async function selectTheme(filename) {
            await applyTheme(filename);
            closeCommandPalette();
            showStatus(`Theme changed to ${filename.replace('.css', '').replace(/_/g, ' ').replace(/-/g, ' ')}`);
        }

        async function toggleDiscordRpc() {
            closeCommandPalette();
            try {
                const result = await pywebview.api.toggle_discord_rpc(!discordRpcEnabled);
                if (result.success) {
                    discordRpcEnabled = result.enabled;
                    showStatus(`Discord RPC ${discordRpcEnabled ? 'enabled' : 'disabled'}`);
                } else {
                    showStatus('Discord RPC: ' + (result.error || 'Error'));
                }
            } catch (e) {
                showStatus('Discord RPC not available');
            }
        }

        async function initDiscordRpcStatus() {
            try {
                const result = await pywebview.api.get_discord_rpc_status();
                discordRpcEnabled = result.enabled;
            } catch (e) {
                discordRpcEnabled = false;
            }
        }

        function showStatus(message) {
            DOM.status.textContent = message;
            DOM.status.style.display = 'block';
            setTimeout(() => DOM.status.style.display = 'none', 2000);
        }

        function handleCommandPaletteKeydown(e) {
            const items = DOM.commandPaletteList.querySelectorAll('.command-palette-item');
            const maxIndex = items.length - 1;

            if (e.key === 'Escape') {
                closeCommandPalette();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                commandPaletteSelectedIndex = Math.min(commandPaletteSelectedIndex + 1, maxIndex);
                updateSelectedItem();
                items[commandPaletteSelectedIndex]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                commandPaletteSelectedIndex = Math.max(commandPaletteSelectedIndex - 1, 0);
                updateSelectedItem();
                items[commandPaletteSelectedIndex]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                executeSelectedCommand();
            } else if (e.key === 'Backspace' && DOM.commandPaletteInput.value === '' && commandPaletteMode === 'themes') {
                commandPaletteMode = 'commands';
                DOM.commandPaletteInput.placeholder = 'Type a command...';
                renderCommandList('');
            }
        }


        // === Language Map (pre-defined, avoids recreating on each call) ===
        const LANG_MAP = {
            'js': 'javascript',
            'py': 'python',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'xml': 'xml',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript'
        };

        function getLanguageFromPath(filepath) {
            if (!filepath) return 'plaintext';
            const ext = filepath.split('.').pop().toLowerCase();
            return LANG_MAP[ext] || 'plaintext';
        }

        // === Syntax Highlighting (debounced for performance) ===
        function updateSyntaxHighlightCore() {
            const code = DOM.editor.value;
            const lang = getLanguageFromPath(currentFilePath);

            // Only update if content changed significantly
            DOM.syntaxHighlight.innerHTML = `<code class="language-${lang}">${escapeHtml(code)}</code>`;
            hljs.highlightElement(DOM.syntaxHighlight.querySelector('code'));

            // Sync scroll
            DOM.syntaxHighlight.scrollTop = DOM.editor.scrollTop;
            DOM.syntaxHighlight.scrollLeft = DOM.editor.scrollLeft;
        }

        // Debounced version - waits 150ms after last keystroke
        const updateSyntaxHighlight = debounce(updateSyntaxHighlightCore, 150);

        // Immediate version for initial load/tab switch
        function updateSyntaxHighlightImmediate() {
            updateSyntaxHighlightCore();
        }

        // Throttled scroll sync - only sync every 16ms (60fps)
        const syncScroll = throttle(() => {
            DOM.syntaxHighlight.scrollTop = DOM.editor.scrollTop;
            DOM.syntaxHighlight.scrollLeft = DOM.editor.scrollLeft;
        }, 16);

        // === File Tree (with event delegation) ===
        let fileTreeItemsMap = new Map(); // Map path -> item data for event delegation

        function renderTree() {
            DOM.fileTree.innerHTML = '';
            fileTreeItemsMap.clear();
            renderTreeItems(fileTree, DOM.fileTree, '');

            // Allow right-click on empty area
            DOM.fileTree.oncontextmenu = (e) => {
                if (e.target === DOM.fileTree) {
                    e.preventDefault();
                    showContextMenu(e, null);
                }
            };
        }

        function renderTreeItems(items, container, parentPath) {
            const fragment = document.createDocumentFragment(); // Batch DOM operations

            items.forEach(item => {
                fileTreeItemsMap.set(item.path, item);

                const itemDiv = document.createElement('div');
                const itemContent = document.createElement('div');
                itemContent.className = 'tree-item';
                itemContent.dataset.path = item.path;
                itemContent.dataset.type = item.type;
                itemContent.dataset.name = item.name;

                if (item.type === 'folder') {
                    const arrow = document.createElement('span');
                    arrow.className = 'tree-arrow';
                    if (item.children && item.children.length > 0) {
                        arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
                        if (collapsedFolders.has(item.path)) {
                            arrow.classList.add('collapsed');
                        }
                    } else {
                        arrow.classList.add('empty');
                    }
                    itemContent.appendChild(arrow);

                    const icon = document.createElement('span');
                    icon.className = 'tree-icon';
                    icon.innerHTML = '<i class="fas fa-folder" style="color: #dcb67a;"></i>';
                    itemContent.appendChild(icon);
                } else {
                    const emptyArrow = document.createElement('span');
                    emptyArrow.className = 'tree-arrow empty';
                    itemContent.appendChild(emptyArrow);

                    const icon = document.createElement('span');
                    icon.className = 'tree-icon';
                    icon.innerHTML = '<i class="fas fa-file-code" style="color: #519aba;"></i>';
                    itemContent.appendChild(icon);
                }

                const label = document.createElement('span');
                label.className = 'tree-label';
                label.textContent = item.name;
                itemContent.appendChild(label);

                if (item.path === currentFilePath) {
                    itemContent.classList.add('selected');
                }

                // Event delegation - single listener handles all items
                itemContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (item.type === 'folder') {
                        toggleFolder(item.path);
                    } else {
                        openFile(item.path);
                    }
                });

                itemContent.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showContextMenu(e, item);
                });

                itemDiv.appendChild(itemContent);

                if (item.type === 'folder' && item.children) {
                    const childrenDiv = document.createElement('div');
                    childrenDiv.className = 'tree-children';
                    if (collapsedFolders.has(item.path)) {
                        childrenDiv.classList.add('collapsed');
                    }
                    renderTreeItems(item.children, childrenDiv, item.path);
                    itemDiv.appendChild(childrenDiv);
                }

                fragment.appendChild(itemDiv);
            });

            container.appendChild(fragment);
        }

        function toggleFolder(path) {
            if (collapsedFolders.has(path)) {
                collapsedFolders.delete(path);
            } else {
                collapsedFolders.add(path);
            }
            renderTree();
        }

        function collapseAllFolders(items) {
            items.forEach(item => {
                if (item.type === 'folder') {
                    collapsedFolders.add(item.path);
                    if (item.children) {
                        collapseAllFolders(item.children);
                    }
                }
            });
        }

        // === Tabs ===
        function renderTabs() {
            const fragment = document.createDocumentFragment();
            DOM.tabsContainer.innerHTML = '';

            openTabs.forEach(filepath => {
                const tab = document.createElement('div');
                tab.className = 'tab';
                if (filepath === currentFilePath) {
                    tab.classList.add('active');
                }

                const filename = filepath.split('/').pop();
                tab.innerHTML = `
                    <span>${escapeHtml(filename)}</span>
                    <span class="tab-close" data-path="${escapeHtml(filepath)}">✕</span>
                `;

                tab.addEventListener('click', (e) => {
                    if (e.target.classList.contains('tab-close')) {
                        closeTab(e.target.dataset.path, e);
                    } else {
                        switchToTab(filepath);
                    }
                });

                fragment.appendChild(tab);
            });

            DOM.tabsContainer.appendChild(fragment);
        }

        function switchToTab(filepath) {
            if (currentFilePath) {
                tabContents[currentFilePath] = DOM.editor.value;
            }

            currentFilePath = filepath;
            DOM.editor.value = tabContents[filepath] || '';
            DOM.currentFile.textContent = filepath;
            DOM.saveBtn.disabled = false;

            updateSyntaxHighlightImmediate();
            renderTabs();
            renderTree();
        }

        function closeTab(filepath, event) {
            event.stopPropagation();

            const index = openTabs.indexOf(filepath);
            if (index > -1) {
                openTabs.splice(index, 1);
                delete tabContents[filepath];

                if (filepath === currentFilePath) {
                    if (openTabs.length > 0) {
                        const newIndex = Math.min(index, openTabs.length - 1);
                        switchToTab(openTabs[newIndex]);
                    } else {
                        currentFilePath = null;
                        DOM.editor.value = '';
                        DOM.currentFile.textContent = 'No file open';
                        DOM.saveBtn.disabled = true;
                        updateSyntaxHighlightImmediate();
                    }
                }

                renderTabs();
                renderTree();
            }
        }

        // === File Operations ===
        async function selectFolder() {
            const result = await pywebview.api.select_folder();
            if (result.success) {
                DOM.folderName.textContent = result.folder;
                workspaceFolder = result.folder;
                DOM.welcome.style.display = 'none';
                DOM.editorSection.style.display = 'flex';
                collapsedFolders.clear();
                await loadFileTree();
            }
        }

        async function loadFileTree() {
            const result = await pywebview.api.get_file_tree();
            if (result.success) {
                fileTree = result.tree;
                workspaceFolder = result.folder;
                collapseAllFolders(fileTree);
                renderTree();
            }
        }

        async function openFile(filepath) {
            if (openTabs.includes(filepath)) {
                switchToTab(filepath);
                return;
            }

            const result = await pywebview.api.read_file(filepath);
            if (result.success) {
                openTabs.push(filepath);
                tabContents[filepath] = result.content;
                switchToTab(filepath);
            } else {
                alert('Error: ' + result.error);
            }
        }

        async function saveCurrentFile() {
            if (!currentFilePath) return;

            const content = DOM.editor.value;
            const result = await pywebview.api.save_file(currentFilePath, content);

            if (result.success) {
                tabContents[currentFilePath] = content;
                DOM.status.textContent = '✓ Saved';
                DOM.status.style.display = 'block';
                setTimeout(() => DOM.status.style.display = 'none', 2000);
            } else {
                alert('Error: ' + result.error);
            }
        }

        // === Context Menu ===
        function showContextMenu(e, item) {
            contextTarget = item;
            DOM.contextMenu.style.display = 'block';

            let x = e.pageX;
            let y = e.pageY;

            if (x + 250 > window.innerWidth) x = window.innerWidth - 250;
            if (y + DOM.contextMenu.offsetHeight > window.innerHeight) y = window.innerHeight - DOM.contextMenu.offsetHeight;

            DOM.contextMenu.style.left = x + 'px';
            DOM.contextMenu.style.top = y + 'px';
        }

        async function contextAction(action) {
            DOM.contextMenu.style.display = 'none';

            const targetPath = contextTarget ? contextTarget.path : '';
            const targetType = contextTarget ? contextTarget.type : 'folder';

            if (action === 'newFile') {
                const filename = await showInputModal('New File', 'Enter file name:');
                if (filename) {
                    const parentPath = targetType === 'folder' ? targetPath : targetPath.split('/').slice(0, -1).join('/');
                    const result = await pywebview.api.create_file(parentPath, filename);
                    if (result.success) {
                        await loadFileTree();
                    } else {
                        alert('Error: ' + result.error);
                    }
                }
            } else if (action === 'newFolder') {
                const foldername = await showInputModal('New Folder', 'Enter folder name:');
                if (foldername) {
                    const parentPath = targetType === 'folder' ? targetPath : targetPath.split('/').slice(0, -1).join('/');
                    const result = await pywebview.api.create_folder(parentPath, foldername);
                    if (result.success) {
                        await loadFileTree();
                    } else {
                        alert('Error: ' + result.error);
                    }
                }
            } else if (action === 'rename') {
                if (!contextTarget) return;
                const newName = await showInputModal('Rename', 'Enter new name:', contextTarget.name);
                if (newName && newName !== contextTarget.name) {
                    const result = await pywebview.api.rename_item(contextTarget.path, newName);
                    if (result.success) {
                        await loadFileTree();
                    } else {
                        alert('Error: ' + result.error);
                    }
                }
            } else if (action === 'delete') {
                if (!contextTarget) return;
                const confirmed = await showConfirmModal('Delete', `Are you sure you want to delete '${contextTarget.name}'?`);
                if (confirmed) {
                    const result = await pywebview.api.delete_item(contextTarget.path);
                    if (result.success) {
                        if (currentFilePath === contextTarget.path) {
                            closeTab(contextTarget.path, { stopPropagation: () => { } });
                        }
                        await loadFileTree();
                    } else {
                        alert('Error: ' + result.error);
                    }
                }
            } else if (action === 'reveal') {
                if (!contextTarget) return;
                await pywebview.api.reveal_item(contextTarget.path);
            } else if (action === 'copyPath') {
                if (!contextTarget) return;
                const result = await pywebview.api.get_full_path(contextTarget.path);
                if (result.success) {
                    navigator.clipboard.writeText(result.path);
                } else {
                    alert('Error getting path');
                }
            } else if (action === 'copyRelativePath') {
                if (!contextTarget) return;
                navigator.clipboard.writeText(contextTarget.path);
            } else if (action === 'copy') {
                if (!contextTarget) return;
                const result = await pywebview.api.copy_item(contextTarget.path, contextTarget.type);
                if (result.success) {
                    DOM.status.textContent = `✓ Copied '${result.copied}'`;
                    DOM.status.style.display = 'block';
                    setTimeout(() => DOM.status.style.display = 'none', 2000);
                } else {
                    alert('Error: ' + result.error);
                }
            } else if (action === 'paste') {
                const pasteTargetPath = contextTarget ? contextTarget.path : '';
                const result = await pywebview.api.paste_item(pasteTargetPath);
                if (result.success) {
                    await loadFileTree();
                    DOM.status.textContent = `✓ Pasted '${result.pasted}'`;
                    DOM.status.style.display = 'block';
                    setTimeout(() => DOM.status.style.display = 'none', 2000);
                } else {
                    alert('Error: ' + result.error);
                }
            }
        }

        // === Modal Logic ===
        function showInputModal(title, message, defaultValue = '') {
            return new Promise((resolve) => {
                modalResolve = resolve;
                DOM.modalTitle.textContent = title;
                if (message) {
                    DOM.modalMessage.textContent = message;
                    DOM.modalMessage.style.display = 'block';
                } else {
                    DOM.modalMessage.style.display = 'none';
                }

                DOM.modalInput.style.display = 'block';
                DOM.modalInput.value = defaultValue;

                DOM.modalConfirmBtn.onclick = () => {
                    closeModal(DOM.modalInput.value);
                };

                DOM.modalInput.onkeydown = (e) => {
                    if (e.key === 'Enter') closeModal(DOM.modalInput.value);
                    if (e.key === 'Escape') closeModal(null);
                };

                DOM.customModal.style.display = 'flex';
                DOM.modalInput.focus();
            });
        }

        function showConfirmModal(title, message) {
            return new Promise((resolve) => {
                modalResolve = resolve;
                DOM.modalTitle.textContent = title;
                DOM.modalMessage.textContent = message;
                DOM.modalMessage.style.display = 'block';
                DOM.modalInput.style.display = 'none';

                DOM.modalConfirmBtn.onclick = () => {
                    closeModal(true);
                };

                DOM.customModal.style.display = 'flex';
            });
        }

        function closeModal(value = null) {
            DOM.customModal.style.display = 'none';
            if (modalResolve) {
                modalResolve(value);
                modalResolve = null;
            }
        }

        // === Initialize everything when DOM is ready ===
        document.addEventListener('DOMContentLoaded', () => {
            initDOMCache();

            // Terminal Resizer
            DOM.termResizer.addEventListener('mousedown', (e) => {
                isTermResizing = true;
                DOM.termResizer.classList.add('resizing');
                document.body.style.cursor = 'row-resize';
                document.body.style.userSelect = 'none';
            });

            // Sidebar Resizer
            DOM.resizer.addEventListener('mousedown', (e) => {
                isResizing = true;
                DOM.resizer.classList.add('resizing');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
            });

            // Combined mousemove handler
            document.addEventListener('mousemove', (e) => {
                if (isTermResizing) {
                    const containerHeight = DOM.editorSection.offsetHeight;
                    const newHeight = containerHeight - (e.clientY - DOM.editorSection.getBoundingClientRect().top);
                    if (newHeight > 50 && newHeight < containerHeight - 100) {
                        DOM.terminalSection.style.height = newHeight + 'px';
                    }
                }
                if (isResizing) {
                    const newWidth = e.clientX;
                    if (newWidth > 150 && newWidth < 600) {
                        DOM.sidebar.style.width = newWidth + 'px';
                    }
                }
            });

            // Combined mouseup handler
            document.addEventListener('mouseup', () => {
                if (isTermResizing) {
                    isTermResizing = false;
                    DOM.termResizer.classList.remove('resizing');
                    document.body.style.cursor = 'default';
                    document.body.style.userSelect = 'auto';
                }
                if (isResizing) {
                    isResizing = false;
                    DOM.resizer.classList.remove('resizing');
                    document.body.style.cursor = 'default';
                    document.body.style.userSelect = 'auto';
                }
            });

            // Terminal input
            DOM.termInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    const command = DOM.termInput.value;
                    if (!command.trim()) return;

                    appendToTerminal(command, true);
                    DOM.termInput.value = '';

                    termHistory.push(command);
                    termHistoryIndex = termHistory.length;

                    DOM.termContent.scrollTop = DOM.termContent.scrollHeight;

                    try {
                        const result = await pywebview.api.terminal_run(command);
                        if (result.success) {
                            if (result.output) {
                                appendToTerminal(result.output, false);
                            }
                            if (result.cwd) {
                                DOM.termPrompt.textContent = 'PS ' + result.cwd + ' >';
                            }
                        } else {
                            appendToTerminal('Error: ' + result.error, false, true);
                        }
                    } catch (err) {
                        appendToTerminal('Error: ' + err, false, true);
                    }

                    DOM.termContent.scrollTop = DOM.termContent.scrollHeight;
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (termHistoryIndex > 0) {
                        termHistoryIndex--;
                        DOM.termInput.value = termHistory[termHistoryIndex];
                    }
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (termHistoryIndex < termHistory.length - 1) {
                        termHistoryIndex++;
                        DOM.termInput.value = termHistory[termHistoryIndex];
                    } else {
                        termHistoryIndex = termHistory.length;
                        DOM.termInput.value = '';
                    }
                }
            });

            // Editor input - debounced syntax highlighting
            DOM.editor.addEventListener('input', updateSyntaxHighlight);

            // Editor scroll - throttled sync
            DOM.editor.addEventListener('scroll', syncScroll);

            // Keyboard shortcuts
            DOM.editor.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    saveCurrentFile();
                }
            });

            // Hide context menu on click
            document.addEventListener('click', (e) => {
                DOM.contextMenu.style.display = 'none';
                // Close command palette when clicking outside
                if (commandPaletteOpen && !e.target.closest('.command-palette')) {
                    closeCommandPalette();
                }
            });

            // Global keyboard shortcut for Command Palette (Ctrl+Shift+P)
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                    e.preventDefault();
                    if (commandPaletteOpen) {
                        closeCommandPalette();
                    } else {
                        openCommandPalette();
                    }
                }
                // Also support F1 like VS Code
                if (e.key === 'F1') {
                    e.preventDefault();
                    if (commandPaletteOpen) {
                        closeCommandPalette();
                    } else {
                        openCommandPalette();
                    }
                }
            });

            // Command Palette input listeners
            DOM.commandPaletteInput.addEventListener('input', (e) => {
                commandPaletteSelectedIndex = 0;
                if (commandPaletteMode === 'themes') {
                    renderThemeList(e.target.value);
                } else {
                    renderCommandList(e.target.value);
                }
            });

            DOM.commandPaletteInput.addEventListener('keydown', handleCommandPaletteKeydown);

            // Initialize theme and Discord RPC status
            loadSavedTheme();
            initDiscordRpcStatus();
        });
