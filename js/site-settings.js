/**
 * QCV Site Settings Loader
 * Loads settings from Firebase and applies them to the current page in real-time
 * Include this script in any page that should respect admin settings
 */
(function(){
    const CFG = (window.QCVApp && window.QCVApp.firebaseConfig) || {
        apiKey: "AIzaSyA2pXUB830VPoro1BChDY0Ii5Gt_BTrK8I",
        authDomain: "qwcv-1cfad.firebaseapp.com",
        databaseURL: "https://qwcv-1cfad-default-rtdb.firebaseio.com",
        projectId: "qwcv-1cfad",
        storageBucket: "qwcv-1cfad.firebasestorage.app",
        messagingSenderId: "792471802122",
        appId: "1:792471802122:web:808e04099afc90315aaaf3"
    };

    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
        import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

        const app = initializeApp(${JSON.stringify(CFG)});
        const db = getDatabase(app);

        let siteData = {};
        let retryCount = 0;
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 3000;

        // ===== LOAD ALL SETTINGS WITH RETRY =====
        function attachListener() {
            onValue(ref(db, 'siteSettings'), (snap) => {
                siteData = snap.val() || {};
                retryCount = 0;
                applyAll();
            }, (error) => {
                console.error('Firebase siteSettings listener error:', error);
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    console.log('Retrying Firebase connection (' + retryCount + '/' + MAX_RETRIES + ')...');
                    setTimeout(attachListener, RETRY_DELAY);
                }
            });
        }

        attachListener();

        function applyAll() {
            applyPerformanceOptimizations();
            applyColors();
            applyBanner();
            applySEO();
            applyMaintenance();
            applyHero();
            applyFooter();
            applyPricing();
        }

        function applyPerformanceOptimizations() {
            const preconnects = [
                'https://fonts.googleapis.com',
                'https://fonts.gstatic.com',
                'https://cdnjs.cloudflare.com',
                'https://www.gstatic.com'
            ];

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

        // ===== COLORS =====
        function applyColors() {
            const c = siteData.colors || {};
            const root = document.documentElement;
            if(c.primary) root.style.setProperty('--accent', c.primary);
            if(c.accent) root.style.setProperty('--sky', c.accent);
            if(c.accent2) root.style.setProperty('--accent2', c.accent2);
            if(c.green) root.style.setProperty('--green', c.green);
            if(c.red) root.style.setProperty('--red', c.red);
            if(c.purple) root.style.setProperty('--purple', c.purple);
            if(c.yellow) root.style.setProperty('--yellow', c.yellow);
            if(c.background) root.style.setProperty('--bg', c.background);
            if(c.cardBg) root.style.setProperty('--card', c.cardBg);
            if(c.text) root.style.setProperty('--text', c.text);
            if(c.muted) root.style.setProperty('--muted', c.muted);
            if(c.border) root.style.setProperty('--border', c.border);
        }

        // ===== BANNER =====
        function applyBanner() {
            const b = siteData.banner || {};
            if(!b.enabled || !b.text) return;
            const existing = document.getElementById('site-banner');
            if(existing) existing.remove();
            const banner = document.createElement('div');
            banner.id = 'site-banner';
            banner.style.cssText = 'background:' + (b.bgColor || '#0003c9') + ';color:' + (b.textColor || '#fff') + ';text-align:center;padding:10px 20px;font-size:0.85rem;font-weight:600;font-family:Cairo,sans-serif;position:relative;z-index:9999';
            banner.innerHTML = b.link
                ? '<a href="' + b.link + '" style="color:' + (b.textColor || '#fff') + ';text-decoration:none">' + b.text + '</a>'
                : b.text;
            document.body.insertBefore(banner, document.body.firstChild);
        }

        // ===== SEO =====
        function applySEO() {
            const s = siteData.seo || {};
            if(s.title) document.title = s.title;
            if(s.description) {
                let meta = document.querySelector('meta[name="description"]');
                if(meta) meta.content = s.description;
            }
            if(s.keywords) {
                let meta = document.querySelector('meta[name="keywords"]');
                if(meta) meta.content = s.keywords;
            }
            if(s.ogImage) {
                let meta = document.querySelector('meta[property="og:image"]');
                if(meta) meta.content = s.ogImage;
            }
        }

        // ===== MAINTENANCE =====
        function applyMaintenance() {
            const m = siteData.maintenance;
            const enabled = (m === true || (m === true) || (m && typeof m === 'object' && m.enabled === true) || (m && m.enabled === 'true'));
            if(!enabled) return;
            const page = location.pathname.split('/').pop() || 'index.html';
            const bypassPages = (window.QCVApp && window.QCVApp.maintenanceBypassPages) || ['admin.html', 'admin-setup.html', 'login.html', 'editor.html', 'portfolio-view.html'];
            if(bypassPages.includes(page)) return;
            const msg = m.message || 'الموقع تحت الصيانة حالياً. سنعود قريباً.';
            const bgColor = m.bgColor || '#f9fafb';
            const textColor = m.textColor || '#1a1a2e';
            const accentColor = m.accentColor || '#0003c9';

            const maintenanceHtml = [
                '<!DOCTYPE html>',
                '<html lang="ar" dir="rtl">',
                '<head>',
                '<meta charset="UTF-8">',
                '<meta name="viewport" content="width=device-width,initial-scale=1.0">',
                '<title>صيانة - QCV</title>',
                '<link rel="icon" type="image/png" href="https://i.postimg.cc/X7NnYC6c/APn63BX1YSOv0Hkb-H4UUXp-img-4-1785173240000-na1fn-c-WN2X2xv-Z29fb3B0a-W9u-NA-removebg-preview.png">',
                '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">',
                '<style>',
                '*{box-sizing:border-box;margin:0;padding:0}',
                'body{background:' + bgColor + ';color:' + textColor + ';font-family:\'Inter\',\'Cairo\',sans-serif;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;position:relative;overflow:hidden}',
                'body::before{content:\'\';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 40%,' + accentColor + '14 0%,transparent 50%),radial-gradient(circle at 70% 60%,' + accentColor + '10 0%,transparent 50%);animation:bgFloat 20s ease-in-out infinite}',
                '@keyframes bgFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(-2%,2%)}}',
                '.box{max-width:520px;position:relative;z-index:1}',
                '.logo{font-size:2.2rem;font-weight:900;margin-bottom:24px;letter-spacing:-1px}.logo span{color:' + accentColor + '}',
                '.icon-wrap{width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,' + accentColor + '22,' + accentColor + '08);display:flex;align-items:center;justify-content:center;margin:0 auto 28px;border:2px solid ' + accentColor + '20;position:relative}',
                '.icon-wrap::after{content:\'\';position:absolute;inset:-8px;border-radius:50%;border:1px dashed ' + accentColor + '20;animation:spin 30s linear infinite}',
                '.icon{font-size:3.5rem;opacity:0.8;animation:float 3s ease-in-out infinite}',
                '@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',
                '@keyframes spin{to{transform:rotate(360deg)}}',
                'h1{font-size:1.8rem;font-weight:900;margin-bottom:10px}',
                'p{font-size:0.95rem;opacity:.7;line-height:1.8;margin-bottom:24px}',
                '.timer{display:flex;gap:10px;justify-content:center}',
                '.timer div{background:' + accentColor + '15;border:1px solid ' + accentColor + '30;border-radius:12px;padding:12px 16px;min-width:70px}',
                '.timer strong{display:block;font-size:1.6rem;font-weight:900;color:' + accentColor + '}',
                '.timer small{font-size:0.65rem;opacity:.7}',
                '.meta{margin-top:18px;padding:12px 20px;border-radius:12px;background:rgba(255,255,255,.7);border:1px solid rgba(15,23,42,.06);font-size:0.75rem;color:rgba(15,23,42,.8);font-weight:700}',
                '</style>',
                '</head>',
                '<body>',
                '<div class="box">',
                '<div class="icon-wrap"><span class="icon">🔧</span></div>',
                '<div class="logo">Q<span>CV</span></div>',
                '<h1>الموقع تحت الصيانة</h1>',
                '<p>' + msg + '</p>',
                '<div class="timer">',
                '<div><strong id="mh">00</strong><small>ساعة</small></div>',
                '<div><strong id="mm">00</strong><small>دقيقة</small></div>',
                '<div><strong id="ms">00</strong><small>ثانية</small></div>',
                '</div>',
                '<div class="meta">سنعود خلال وقت قصير</div>',
                '</div>',
                '<script>',
                'var start = new Date();',
                'setInterval(function(){',
                'var now = new Date();',
                'var diff = Math.max(0, Math.floor((now - start) / 1000));',
                'var h = Math.floor(diff / 3600);',
                'var m = Math.floor((diff % 3600) / 60);',
                'var s = diff % 60;',
                'document.getElementById(\'mh\').textContent = String(h).padStart(2, \'0\');',
                'document.getElementById(\'mm\').textContent = String(m).padStart(2, \'0\');',
                'document.getElementById(\'ms\').textContent = String(s).padStart(2, \'0\');',
                '}, 1000);',
                '</script>',
                '</body>',
                '</html>'
            ].join('');

            document.open();
            document.write(maintenanceHtml);
            document.close();
        }

        // ===== HERO =====
        function applyHero() {
            const h = siteData.hero || {};
            if(!h.title && !h.subtitle && !h.ctaText) return;
            const heroH1 = document.querySelector('.hero h1');
            const heroP = document.querySelector('.hero p');
            const heroBtn = document.querySelector('.hero-btn');
            if(h.title && heroH1) heroH1.textContent = h.title;
            if(h.subtitle && heroP) heroP.textContent = h.subtitle;
            if(h.ctaText && heroBtn) heroBtn.textContent = h.ctaText;
        }

        // ===== FOOTER =====
        function applyFooter() {
            const f = siteData.footer || {};
            if(f.copyright) {
                const fb = document.querySelector('.footer-bottom');
                if(fb) fb.textContent = f.copyright;
            }
            const socials = f.socials || {};
            Object.keys(socials).forEach(platform => {
                const link = document.querySelector('.footer a[href*="' + platform + '"], .footer a[href*="' + platform + '.com"]');
                if(link && socials[platform]) link.href = socials[platform];
            });
        }

        // ===== PRICING =====
        function applyPricing() {
            const p = siteData.pricing || {};
            if(p.plans) {
                document.querySelectorAll('.plan-card, .price-card').forEach((card, i) => {
                    const plan = p.plans[i];
                    if(!plan) return;
                    if(plan.name) { const nameEl = card.querySelector('.plan-name, .p-name, h3'); if(nameEl) nameEl.textContent = plan.name; }
                    if(plan.price) { const priceEl = card.querySelector('.plan-price, .p-price, .price'); if(priceEl) priceEl.textContent = plan.price; }
                });
            }
        }

        // ===== GLOBAL API =====
        let adminSettings = {};

        // Also listen to admin settings (contains aiApiKey, prices, etc.)
        onValue(ref(db, 'settings'), (snap) => {
            adminSettings = snap.val() || {};
        });

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
            get: function() { return { ...siteData, ...adminSettings }; },
            forceRefresh: function() {
                const databaseUrl = (window.QCVApp && window.QCVApp.firebaseConfig && window.QCVApp.firebaseConfig.databaseURL) || 'https://qwcv-1cfad-default-rtdb.firebaseio.com';
                fetch(databaseUrl + '/siteSettings.json')
                    .then(r => r.json())
                    .then(data => { siteData = data || {}; applyAll(); })
                    .catch(() => {});
            }
        };
    `;
    document.head.appendChild(script);
})();

