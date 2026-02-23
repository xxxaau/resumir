// --- Theme Logic ---
(function() {
    const STORAGE_KEY = 'theme';
    const DEFAULT_THEME = 'system';
    const VALID_THEMES = ['system', 'light', 'dark', 'solarized', 'soft-gray'];

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-actual-theme', isDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-actual-theme', theme);
        }
    }

    function initTheme() {
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
            browser.storage.local.get(STORAGE_KEY).then(result => {
                const theme = result[STORAGE_KEY] || DEFAULT_THEME;
                applyTheme(theme);
            }).catch(err => {
                console.error("Error loading theme preference:", err);
                applyTheme(DEFAULT_THEME);
            });

            // Listen for changes
            browser.storage.onChanged.addListener((changes, area) => {
                if (area === 'local' && changes[STORAGE_KEY]) {
                    applyTheme(changes[STORAGE_KEY].newValue);
                }
            });
        } else {
            // Fallback for non-extension context or if storage fails
            applyTheme(DEFAULT_THEME);
        }

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
             // Re-apply if current setting is 'system'
             const currentTheme = document.documentElement.getAttribute('data-theme');
             if (currentTheme === 'system') applyTheme('system');
        });
    }

    initTheme();
})();
