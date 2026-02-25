// --- Theme Logic ---
(function() {
    const STORAGE_KEY = 'theme';
    const DEFAULT_THEME = 'system';

    // Cross-browser storage API
    const storageApi = (typeof browser !== 'undefined' && browser.storage)
        ? browser.storage
        : (typeof chrome !== 'undefined' && chrome.storage)
            ? chrome.storage
            : null;

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
        if (storageApi && storageApi.sync) {
            storageApi.sync.get(STORAGE_KEY).then(result => {
                const theme = result[STORAGE_KEY] || DEFAULT_THEME;
                applyTheme(theme);
            }).catch(err => {
                console.error("Error loading theme preference:", err);
                applyTheme(DEFAULT_THEME);
            });

            // Listen for changes in sync storage
            storageApi.onChanged.addListener((changes, area) => {
                if (area === 'sync' && changes[STORAGE_KEY]) {
                    applyTheme(changes[STORAGE_KEY].newValue);
                }
            });
        } else {
            applyTheme(DEFAULT_THEME);
        }

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
             const currentTheme = document.documentElement.getAttribute('data-theme');
             if (currentTheme === 'system') applyTheme('system');
        });
    }

    initTheme();
})();
