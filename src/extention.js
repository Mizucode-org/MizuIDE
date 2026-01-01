// Terminal Hider Extension - Hides terminal when DevTools is opened
const terminalHiderExtension = {
    name: 'Terminal Hider',
    version: '1.0.0',
    description: 'Automatically hides terminal when DevTools/console is opened',
    author: 'Mizu Team',
    permissions: ['terminal.read', 'ui.*'],

    activate(context) {
        console.log('✓ Terminal Hider activated');
        
        let terminalVisible = true;
        let devtoolsDetected = false;
        
        // Multiple DevTools detection methods
        const detectors = [
            // Method 1: Debugger timing (most reliable)
            () => {
                const start = performance.now();
                debugger;
                return performance.now() - start > 50;
            },
            
            // Method 2: Window size change (DevTools reduces viewport)
            () => {
                const threshold = 100;
                const before = window.outerHeight - window.innerHeight;
                setTimeout(() => {
                    const after = window.outerHeight - window.innerHeight;
                    if (Math.abs(after - before) > threshold) {
                        return true;
                    }
                }, 100);
                return false;
            },
            
            // Method 3: Console detection via iframe timing
            () => {
                const test = document.createElement('iframe');
                test.style.display = 'none';
                document.body.appendChild(test);
                const start = performance.now();
                test.contentWindow.console.log('test');
                const end = performance.now();
                document.body.removeChild(test);
                return end - start > 30;
            }
        ];

        // Continuous DevTools detection
        const detectDevTools = () => {
            for (const detector of detectors) {
                try {
                    if (detector()) {
                        return true;
                    }
                } catch (e) {}
            }
            return false;
        };

        // Hide terminal function
        const hideTerminal = () => {
            if (terminalVisible && DOM.terminalSection) {
                DOM.terminalSection.style.display = 'none';
                DOM.termResizer.style.display = 'none';
                terminalVisible = false;
                context.ui.showToast('🔒 Terminal hidden (DevTools detected)', 2000);
                console.log('Terminal hidden - DevTools detected');
            }
        };

        // Show terminal function
        const showTerminal = () => {
            if (!terminalVisible && DOM.terminalSection) {
                DOM.terminalSection.style.display = 'flex';
                DOM.termResizer.style.display = 'block';
                terminalVisible = true;
                console.log('Terminal restored');
            }
        };

        // Detection loop (check every 500ms)
        const detectionInterval = setInterval(() => {
            const isOpen = detectDevTools();
            
            if (isOpen && !devtoolsDetected) {
                devtoolsDetected = true;
                hideTerminal();
            } else if (!isOpen && devtoolsDetected) {
                devtoolsDetected = false;
                showTerminal();
            }
        }, 500);

        // Additional detection: Keyboard shortcuts (F12, Ctrl+Shift+I)
        const handleKeydown = (e) => {
            if ((e.key === 'F12') || 
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.shiftKey && e.key === 'J')) {
                setTimeout(hideTerminal, 100);
            }
        };

        document.addEventListener('keydown', handleKeydown);

        // Status bar indicator
        const statusItem = context.ui.createStatusBarItem('terminal-status', {
            text: '📱',
            tooltip: 'Terminal Hider Active',
            onClick: () => {
                if (terminalVisible) {
                    hideTerminal();
                } else {
                    showTerminal();
                }
            }
        });
        statusItem.show();

        // Command to toggle manually
        context.commands.register('terminalhider.toggle', () => {
            if (terminalVisible) {
                hideTerminal();
            } else {
                showTerminal();
            }
            return { success: true };
        }, {
            title: 'Toggle Terminal Visibility',
            category: 'Terminal',
            icon: 'fa-eye-slash'
        });

        // Listen for terminal clear (restore visibility)
        context.events.on('terminal:clear', () => {
            setTimeout(showTerminal, 500);
        });

        // Cleanup on deactivate
        this._cleanup = () => {
            clearInterval(detectionInterval);
            document.removeEventListener('keydown', handleKeydown);
            statusItem.dispose();
            showTerminal(); // Restore on deactivate
        };

        context.ui.showMessage('Terminal Hider enabled - DevTools will auto-hide terminal');
    },

    deactivate() {
        if (this._cleanup) {
            this._cleanup();
        }
        console.log('Terminal Hider deactivated');
    }
};

// Auto-register when API is ready
window.mizuAPI?.ready(() => {
    window.mizuAPI.registerExtension('terminal-hider', terminalHiderExtension);
    window.mizuAPI.activateExtension('terminal-hider');
});
