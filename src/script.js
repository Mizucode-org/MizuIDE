// ==================== MIZU CODE - CodeMirror 6 Editor ====================
// Using CodeMirror 6 for proper incremental syntax highlighting
// FIXED: Added ?deps=@codemirror/state@6.4.1 to imports to prevent duplicate state instances
// ============================================================================

// === CodeMirror 6 Imports from ESM CDN (Pinned Dependencies) ===
// We pin all modules to use exactly @codemirror/state@6.4.1 to pass instanceof checks
const STATE_VERSION = '6.4.1';
const DEPS_QUERY = `?deps=@codemirror/state@${STATE_VERSION}`;

import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor } from 'https://esm.sh/@codemirror/view@6.23.0?deps=@codemirror/state@6.4.1';
import { EditorState, Compartment } from 'https://esm.sh/@codemirror/state@6.4.1';
import { defaultKeymap, history, historyKeymap, indentWithTab } from 'https://esm.sh/@codemirror/commands@6.6.0?deps=@codemirror/state@6.4.1';
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap } from 'https://esm.sh/@codemirror/language@6.10.0?deps=@codemirror/state@6.4.1';
import { searchKeymap, highlightSelectionMatches } from 'https://esm.sh/@codemirror/search@6.5.6?deps=@codemirror/state@6.4.1';
import { closeBrackets, closeBracketsKeymap } from 'https://esm.sh/@codemirror/autocomplete@6.12.0?deps=@codemirror/state@6.4.1';
import { javascript } from 'https://esm.sh/@codemirror/lang-javascript@6.2.2?deps=@codemirror/state@6.4.1';
import { python } from 'https://esm.sh/@codemirror/lang-python@6.1.6?deps=@codemirror/state@6.4.1';
import { html } from 'https://esm.sh/@codemirror/lang-html@6.4.9?deps=@codemirror/state@6.4.1';
import { css } from 'https://esm.sh/@codemirror/lang-css@6.3.0?deps=@codemirror/state@6.4.1';
import { json } from 'https://esm.sh/@codemirror/lang-json@6.0.1?deps=@codemirror/state@6.4.1';
import { xml } from 'https://esm.sh/@codemirror/lang-xml@6.1.0?deps=@codemirror/state@6.4.1';
import { java } from 'https://esm.sh/@codemirror/lang-java@6.0.1?deps=@codemirror/state@6.4.1';
import { cpp } from 'https://esm.sh/@codemirror/lang-cpp@6.0.2?deps=@codemirror/state@6.4.1';
import { php } from 'https://esm.sh/@codemirror/lang-php@6.0.1?deps=@codemirror/state@6.4.1';
import { rust } from 'https://esm.sh/@codemirror/lang-rust@6.0.1?deps=@codemirror/state@6.4.1';
import { markdown } from 'https://esm.sh/@codemirror/lang-markdown@6.3.0?deps=@codemirror/state@6.4.1';
import { oneDark } from 'https://esm.sh/@codemirror/theme-one-dark@6.1.2?deps=@codemirror/state@6.4.1';

// === Cached DOM References (fetched once) ===
const DOM = {
    editorWrapper: null,
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

// === CodeMirror Editor Instance ===
let editorView = null;
const languageCompartment = new Compartment();

// Initialize DOM cache after page load
function initDOMCache() {
    DOM.editorWrapper = document.getElementById('editorWrapper');
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
let commandPaletteMode = 'commands';
let commandPaletteSelectedIndex = 0;
let discordRpcEnabled = true;
let currentTheme = 'styles.css';

// === Terminal Output Limiter ===
const MAX_TERMINAL_LINES = 500;
let terminalSession = [];

function trimTerminalOutput() {
    if (DOM.termOutput && DOM.termOutput.children.length > MAX_TERMINAL_LINES) {
        const excess = DOM.termOutput.children.length - MAX_TERMINAL_LINES;
        for (let i = 0; i < excess; i++) {
            DOM.termOutput.removeChild(DOM.termOutput.firstChild);
            terminalSession.shift();
        }
    }
}

function formatTerminalOutput(text) {
    // Handle code blocks with backticks
    if (text.includes('```')) {
        return text.replace(/```([^`]*?)```/g, (match, code) => {
            return `<pre style="background: #1e1e2e; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; color: #a6acaf;">${escapeHtml(code)}</pre>`;
        });
    }
    return escapeHtml(text);
}

function appendToTerminal(text, isCommand, isError = false, isStderr = false) {
    if (!text) return;
    
    // Handle multiple lines
    const lines = text.split('\n');
    
    lines.forEach((line, index) => {
        if (!line && index === lines.length - 1) return; // Skip last empty line
        
        const lineEl = document.createElement('div');
        lineEl.style.wordWrap = 'break-word';
        lineEl.style.whiteSpace = 'pre-wrap';
        lineEl.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
        
        if (isCommand) {
            const promptText = DOM.termPrompt.textContent;
            lineEl.style.color = '#cccccc';
            lineEl.innerHTML = `<span style="color: #dbd9d9; font-weight: bold; margin-right: 8px;">${promptText}</span><span style="color: #61dafb;">${escapeHtml(line)}</span>`;
        } else {
            if (isError || isStderr) {
                lineEl.style.color = '#ff7b72';
                lineEl.innerHTML = escapeHtml(line);
            } else {
                lineEl.style.color = '#a6acaf';
                lineEl.innerHTML = formatTerminalOutput(line);
            }
        }
        
        DOM.termOutput.appendChild(lineEl);
        terminalSession.push({
            text: line,
            isCommand: isCommand,
            isError: isError || isStderr
        });
    });
    
    trimTerminalOutput();
}

function clearTerminal() {
    DOM.termOutput.innerHTML = '';
    terminalSession = [];
}

function getTerminalHistory() {
    return terminalSession;
}

// === Language Extensions Map for CodeMirror ===
const LANG_EXTENSIONS = {
    'js': javascript,
    'jsx': javascript,
    'ts': () => javascript({ typescript: true }),
    'tsx': () => javascript({ typescript: true, jsx: true }),
    'mjs': javascript,
    'cjs': javascript,
    'py': python,
    'html': html,
    'htm': html,
    'css': css,
    'scss': css,
    'less': css,
    'json': json,
    'xml': xml,
    'svg': xml,
    'java': java,
    'cpp': cpp,
    'c': cpp,
    'h': cpp,
    'hpp': cpp,
    'php': php,
    'rs': rust,
    'md': markdown,
    'markdown': markdown
};

function getLanguageExtension(path) {
    if (!path || typeof path !== 'string') return [];
    const ext = path.split('.').pop().toLowerCase();
    const langFn = LANG_EXTENSIONS[ext];
    if (langFn) {
        try {
            return [langFn()];
        } catch (e) {
            console.warn('Language extension error:', e);
            return [];
        }
    }
    return [];
}

// === CodeMirror Editor Creation ===
function createEditorOnce() {
    if (editorView) return;

    editorView = new EditorView({
        state: EditorState.create({
            doc: '',
            extensions: [
                lineNumbers(),
                highlightActiveLineGutter(),
                history(),
                drawSelection(),
                dropCursor(),
                indentOnInput(),
                foldGutter(),
                bracketMatching(),
                closeBrackets(),
                highlightSelectionMatches(),
                highlightActiveLine(),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                keymap.of([
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...searchKeymap,
                    ...historyKeymap,
                    ...foldKeymap,
                    indentWithTab
                ]),
                oneDark,
                languageCompartment.of([]), // language applied later via reconfigure
                EditorView.updateListener.of(update => {
                    if (update.docChanged && currentFilePath) {
                        tabContents[currentFilePath] =
                            update.state.doc.toString();
                    }
                }),
                EditorView.theme({
                    '&': { height: '100%' },
                    '.cm-scroller': { overflow: 'auto' }
                })
            ]
        }),
        parent: DOM.editorWrapper
    });
}

// Get editor content
function getEditorContent() {
    if (!editorView) return '';
    return editorView.state.doc.toString();
}

// Set editor content
function setEditorContent(content, path = '') {
    if (!editorView) return;

    const safePath = path || '';
    const languageExtensions = getLanguageExtension(safePath);

    editorView.dispatch({
        changes: {
            from: 0,
            to: editorView.state.doc.length,
            insert: content
        },
        effects: languageCompartment.reconfigure(languageExtensions)
    });
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

let fileTreeItemsMap = new Map();

function renderTree() {
    DOM.fileTree.innerHTML = '';
    fileTreeItemsMap.clear();
    renderTreeItems(fileTree, DOM.fileTree, '');

    DOM.fileTree.oncontextmenu = (e) => {
        if (e.target === DOM.fileTree) {
            e.preventDefault();
            showContextMenu(e, null);
        }
    };
}

function renderTreeItems(items, container, parentPath) {
    const fragment = document.createDocumentFragment();

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
    if (currentFilePath && editorView) {
        tabContents[currentFilePath] = editorView.state.doc.toString();
    }

    currentFilePath = filepath;
    setEditorContent(tabContents[filepath] || '', filepath);
    DOM.currentFile.textContent = filepath;
    DOM.saveBtn.disabled = false;

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
                setEditorContent('', '');
                DOM.currentFile.textContent = 'No file open';
                DOM.saveBtn.disabled = true;
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

    const content = getEditorContent();
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

// === Expose functions globally for onclick handlers ===
window.selectFolder = selectFolder;
window.saveCurrentFile = saveCurrentFile;
window.clearTerminal = clearTerminal;
window.contextAction = contextAction;
window.closeModal = closeModal;
window.getTerminalHistory = getTerminalHistory;

// === Initialize everything when DOM is ready ===
document.addEventListener('DOMContentLoaded', () => {
    initDOMCache();

    // Create initial empty editor
    createEditorOnce();

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

    // Terminal input - Enhanced with better formatting and shortcuts
    DOM.termInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const command = DOM.termInput.value.trim();
            if (!command) return;

            appendToTerminal(command, true);
            DOM.termInput.value = '';

            termHistory.push(command);
            termHistoryIndex = termHistory.length;

            DOM.termContent.scrollTop = DOM.termContent.scrollHeight;

            if (command === 'debug-theme-enable') {
                toggleDebugTheme();
                return;
            }

            try {
                const result = await pywebview.api.terminal_run(command);
                
                // Handle clear command
                if (result.clear) {
                    clearTerminal();
                } else {
                    // Display output with proper formatting
                    if (result.output) {
                        appendToTerminal(result.output, false, result.isError || false);
                    }
                    if (result.stderr) {
                        appendToTerminal(result.stderr, false, true, true);
                    }
                }
                
                // Update prompt with current working directory
                if (result.cwd) {
                    const shortCwd = result.cwd.length > 40 ? 
                        '...' + result.cwd.slice(-37) : result.cwd;
                    DOM.termPrompt.textContent = 'PS ' + shortCwd + ' >';
                }
                
            } catch (err) {
                appendToTerminal(`Error: ${err}`, false, true);
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
            
        } else if (e.key === 'Tab') {
            // Tab completion support
            e.preventDefault();
            const currentValue = DOM.termInput.value;
            const lastSpace = currentValue.lastIndexOf(' ');
            const prefix = lastSpace === -1 ? currentValue : currentValue.slice(lastSpace + 1);
            
            if (prefix) {
                // Simple path/command completion
                DOM.termInput.value = currentValue + '\t';
            }
            
        } else if (e.ctrlKey && e.key === 'c') {
            // Ctrl+C - Clear current input or cancel process
            e.preventDefault();
            DOM.termInput.value = '';
            appendToTerminal('Cancelled', true);
            
        } else if (e.ctrlKey && e.key === 'l') {
            // Ctrl+L - Clear terminal (like bash)
            e.preventDefault();
            clearTerminal();
            
        } else if (e.key === 'Delete') {
            // Delete key support
            if (DOM.termInput.selectionStart === DOM.termInput.selectionEnd) {
                const pos = DOM.termInput.selectionStart;
                const val = DOM.termInput.value;
                DOM.termInput.value = val.slice(0, pos) + val.slice(pos + 1);
                DOM.termInput.selectionStart = DOM.termInput.selectionEnd = pos;
                e.preventDefault();
            }
        }
    });

    // Hide context menu on click
    document.addEventListener('click', (e) => {
        DOM.contextMenu.style.display = 'none';
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
        // Save shortcut - Ctrl+S
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveCurrentFile();
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

    
});
function toggleDebugTheme() {
    const enabled = document.body.classList.toggle("debug");

    console.warn(
        enabled ? "Debug Theme Enabled" : "Debug Theme Disabled"
    );
}
