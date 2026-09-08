/**
 * QCV Site Settings Loader
 * Loads settings from Firebase and applies them to the current page in real-time.
 * Safe, minimal and non-breaking version.
 */
(function () {
    const CFG = (window.QCVApp && window.QCVApp.firebaseConfig) || {
        apiKey: 'AIzaSyA2pXUB830VPoro1BChDY0Ii5Gt_BTrK8I',
        authDomain: 'qwcv-1cfad.firebaseapp.com',
        databaseURL: 'https://qwcv-1cfad-default-rtdb.firebaseio.com',
        projectId: 'qwcv-1cfad',
        storageBucket: 'qwcv-1cfad.firebasestorage.app',
        messagingSenderId: '792471802122',
        appId: '1:792471802122:web:808e04099afc90315aaaf3'
    };

    const databaseUrl = (window.QCVApp && window.QCVApp.firebaseConfig && window.QCVApp.firebaseConfig.databaseURL) || CFG.databaseURL;
    let siteData = {};
    let adminSettings = {};

    function applyPerformanceOptimizations() {
        const preconnects = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'https://www.gstatic.com'];
        preconnects.forEach((href) => {
            if (document.querySelector('link[rel="preconnect"][href="' + href + '"]')) return;
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = href;
            if (href.includes('fonts.gstatic.com') || href.includes('cdnjs.cloudflare.com')) {
                link.crossOrigin = 'anonymous';
            }
            document.head.appendChild(link);
        });

        document.querySelectorAll('img:not([loading])').forEach((img) => {
            const isHero = img.closest('header, .hero, .banner');
            if (isHero) {
                img.setAttribute('fetchpriority', 'high');
                return;
            }
            img.loading = 'lazy';
        });

        document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
            if (!img.getAttribute('decoding')) img.decoding = 'async';
        });
    }

    function applyColors() {
        const c = siteData.colors || {};
        const root = document.documentElement;
        if (c.primary) root.style.setProperty('--accent', c.primary);
        if (c.accent) root.style.setProperty('--sky', c.accent);
        if (c.accent2) root.style.setProperty('--accent2', c.accent2);
        if (c.green) root.style.setProperty('--green', c.green);
        if (c.red) root.style.setProperty('--red', c.red);
        if (c.purple) root.style.setProperty('--purple', c.purple);
        if (c.yellow) root.style.setProperty('--yellow', c.yellow);
        if (c.background) root.style.setProperty('--bg', c.background);
        if (c.cardBg) root.style.setProperty('--card', c.cardBg);
        if (c.text) root.style.setProperty('--text', c.text);
        if (c.muted) root.style.setProperty('--muted', c.muted);
        if (c.border) root.style.setProperty('--border', c.border);
    }

    function applyBanner() {
        const b = siteData.banner || {};
        if (!b.enabled || !b.text) return;
        const existing = document.getElementById('site-banner');
        if (existing) existing.remove();
        const banner = document.createElement('div');
        banner.id = 'site-banner';
        banner.style.cssText = 'background:' + (b.bgColor || '#0003c9') + ';color:' + (b.textColor || '#fff') + ';text-align:center;padding:10px 20px;font-size:0.85rem;font-weight:600;font-family:Cairo,sans-serif;position:relative;z-index:9999';
        banner.innerHTML = b.link
            ? '<a href="' + b.link + '" style="color:' + (b.textColor || '#fff') + ';text-decoration:none">' + b.text + '</a>'
            : b.text;
        document.body.insertBefore(banner, document.body.firstChild);
    }

    function applySEO() {
        const s = siteData.seo || {};
        if (s.title) document.title = s.title;
        if (s.description) {
            const meta = document.querySelector('meta[name="description"]');
            if (meta) meta.content = s.description;
        }
        if (s.keywords) {
            const meta = document.querySelector('meta[name="keywords"]');
            if (meta) meta.content = s.keywords;
        }
        if (s.ogImage) {
            const meta = document.querySelector('meta[property="og:image"]');
            if (meta) meta.content = s.ogImage;
        }
    }

    function applyHero() {
        const h = siteData.hero || {};
        if (!h.title) return;
        document.querySelectorAll('.hero-title, .hero h1, h1.hero').forEach((el) => {
            el.textContent = h.title;
        });
        document.querySelectorAll('.hero-subtitle, .hero p, .subtitle').forEach((el) => {
            if (h.subtitle) el.textContent = h.subtitle;
        });
    }

    function applyPricing() {
        const p = siteData.pricing || {};
        if (!p.plans) return;
        document.querySelectorAll('.plan-card, .price-card').forEach((card, i) => {
            const plan = p.plans[i];
            if (!plan) return;
            if (plan.name) {
                const nameEl = card.querySelector('.plan-name, .p-name, h3');
                if (nameEl) nameEl.textContent = plan.name;
            }
            if (plan.price) {
                const priceEl = card.querySelector('.plan-price, .p-price, .price');
                if (priceEl) priceEl.textContent = plan.price;
            }
        });
    }

    function applyFooter() {
        const f = siteData.footer || {};
        if (f.text) {
            const el = document.querySelector('.footer-copy, .copyright, footer p');
            if (el) el.textContent = f.text;
        }
        const socials = f.socials || {};
        Object.keys(socials).forEach((platform) => {
            const link = document.querySelector('.footer a[href*="' + platform + '"] , .footer a[href*="' + platform + '.com"]');
            if (link && socials[platform]) link.href = socials[platform];
        });
    }

    function applyAll() {
        applyPerformanceOptimizations();
        applyColors();
        applyBanner();
        applySEO();
        applyHero();
        applyFooter();
        applyPricing();
    }

    function fetchJson(url) {
        return fetch(url)
            .then((r) => (r.ok ? r.json() : {}))
            .catch(() => ({}));
    }

    function loadSettings() {
        fetchJson(databaseUrl + '/siteSettings.json').then((data) => {
            siteData = data || {};
            applyAll();
        });

        fetchJson(databaseUrl + '/settings.json').then((data) => {
            adminSettings = data || {};
            applyAll();
        });
    }

    loadSettings();

    window.QCVSettings = {
        get data() { return siteData; },
        get contact() { return siteData.contact || {}; },
        get footer() { return siteData.footer || {}; },
        get hero() { return siteData.hero || {}; },
        get pricing() { return siteData.pricing || {}; },
        get notifications() { return siteData.notifications || {}; },
        get colors() { return siteData.colors || {}; },
        get general() { return siteData.general || {}; },
        get aiApiKey() { return adminSettings.aiApiKey || ''; },
        get deepseekKey() { return adminSettings.deepseekKey || ''; },
        get xaiKey() { return adminSettings.xaiKey || ''; },
        get groqKey() { return adminSettings.groqKey || ''; },
        get openrouterKey() { return adminSettings.openrouterKey || ''; },
        get bluesmindsKey() { return adminSettings.bluesmindsKey || ''; },
        get geminiKey() { return adminSettings.geminiKey || ''; },
        get naraKey() { return adminSettings.naraKey || ''; },
        get all() { return { ...siteData, ...adminSettings }; },
        forceRefresh: function () {
            loadSettings();
        }
    };
})();
