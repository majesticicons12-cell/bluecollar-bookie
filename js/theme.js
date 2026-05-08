(function() {
    function getTheme() {
        return localStorage.getItem('theme') || 'system';
    }

    function applyTheme(theme) {
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    function toggleTheme() {
        const current = getTheme();
        const themes = ['light', 'dark', 'system'];
        const nextIndex = (themes.indexOf(current) + 1) % themes.length;
        const next = themes[nextIndex];
        localStorage.setItem('theme', next);
        applyTheme(next);
        updateButtonLabel(next);
    }

    function updateButtonLabel(theme) {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        const icons = { light: '\u2600\uFE0F', dark: '\uD83C\uDF19', system: '\uD83D\uDD04' };
        btn.textContent = icons[theme] || icons.system;
        btn.title = 'Theme: ' + theme;
    }

    applyTheme(getTheme());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getTheme() === 'system') applyTheme('system');
    });

    document.addEventListener('DOMContentLoaded', function() {
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.addEventListener('click', toggleTheme);
            updateButtonLabel(getTheme());
        }
    });
})();
