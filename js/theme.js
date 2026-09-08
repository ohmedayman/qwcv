(function() {
    const STORAGE_KEY = 'qcv_theme';
    const DARK = 'dark';
    const LIGHT = 'light';

    const root = document.documentElement;

    const darkVars = {
        '--bg': '#0a0e1a',
        '--bg2': '#111827',
        '--card': '#141b2d',
        '--card-border': '#1e293b',
        '--border': '#1e293b',
        '--sidebar': '#111827',
        '--text': '#f1f5f9',
        '--text-primary': '#f1f5f9',
        '--text-secondary': '#94a3b8',
        '--muted': '#94a3b8',
        '--light': '#64748b',
        '--accent': '#0003c9',
        '--accent-glow': 'rgba(0,3,201,0.15)',
        '--accent-light': 'rgba(39,255,237,0.1)',
        '--input-bg': '#0f172a',
        '--input': '#0f172a',
        '--green': '#34d399',
        '--shadow': '0 4px 24px rgba(0,0,0,0.4)'
    };

    const lightVars = {
        '--bg': '#fff',
        '--bg2': '#f9fafb',
        '--card': '#fff',
        '--card-border': '#e5e7eb',
        '--border': '#e5e7eb',
        '--sidebar': '#ffffff',
        '--text': '#1a1a2e',
        '--text-primary': '#1a1a2e',
        '--text-secondary': '#6b7280',
        '--muted': '#6b7280',
        '--light': '#9ca3af',
        '--accent': '#0003c9',
        '--accent-glow': 'rgba(0,3,201,0.08)',
        '--accent-light': '#eef2ff',
        '--input-bg': '#f9fafb',
        '--input': '#f9fafb',
        '--green': '#059669',
        '--shadow': '0 4px 24px rgba(0,0,0,0.08)'
    };

    function getStored() {
        try { return localStorage.getItem(STORAGE_KEY); } catch(e) { return null; }
    }

    function setStored(v) {
        try { localStorage.setItem(STORAGE_KEY, v); } catch(e) {}
    }

    function apply(theme) {
        const vars = theme === DARK ? darkVars : lightVars;
        for (const [k, v] of Object.entries(vars)) {
            root.style.setProperty(k, v);
        }
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(theme === DARK ? 'dark-mode' : 'light-mode');
        root.setAttribute('data-theme', theme);
        updateButtons(theme);
    }

    function updateButtons(theme) {
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            const sunIcon = btn.querySelector('.icon-sun');
            const moonIcon = btn.querySelector('.icon-moon');
            if (sunIcon && moonIcon) {
                sunIcon.style.display = theme === DARK ? 'none' : 'inline';
                moonIcon.style.display = theme === DARK ? 'inline' : 'none';
            }
            btn.title = theme === DARK ? 'Switch to light mode' : 'Switch to dark mode';
        });
    }

    function current() {
        return root.getAttribute('data-theme') || getStored() || LIGHT;
    }

    function toggle() {
        const next = current() === DARK ? LIGHT : DARK;
        setStored(next);
        apply(next);
        return next;
    }

    function initLoader() {
        if (document.querySelector('.page-loader')) return;

        const loader = document.createElement('div');
        loader.className = 'page-loader';
        loader.id = 'pageLoader';
        loader.setAttribute('aria-live', 'polite');
        loader.setAttribute('aria-label', 'جاري التحميل');

        const spinner = document.createElement('div');
        spinner.className = 'loader-spinner';

        const text = document.createElement('div');
        text.className = 'loader-text';
        text.textContent = 'جاري التحميل...';

        loader.appendChild(spinner);
        loader.appendChild(text);
        document.body.appendChild(loader);

        const hideLoader = function () {
            if (!loader) return;
            loader.classList.add('hide');
            setTimeout(function () {
                loader.remove();
            }, 500);
        };

        if (document.readyState === 'complete') {
            setTimeout(hideLoader, 250);
        } else {
            window.addEventListener('load', function () {
                setTimeout(hideLoader, 250);
            }, { once: true });
        }
    }

    function init() {
        const saved = getStored() || LIGHT;
        apply(saved);
        initLoader();
    }

    window.QCVTheme = { toggle: toggle, current: current };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
