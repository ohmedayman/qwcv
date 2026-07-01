/**
 * QCV Site Settings Loader
 * Loads settings from Firebase and applies them to the current page in real-time
 * Include this script in any page that should respect admin settings
 */
(function(){
    const CFG = {
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
            applyColors();
            applyBanner();
            applySEO();
            applyMaintenance();
            applyHero();
            applyFooter();
            applyPricing();
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
            const bypassPages = ['admin.html', 'admin-setup.html', 'login.html', 'editor.html', 'portfolio-view.html'];
            if(bypassPages.includes(page)) return;
            const msg = m.message || 'الموقع تحت الصيانة حالياً. سنعود قريباً.';
            const bgColor = m.bgColor || '#f9fafb';
            const textColor = m.textColor || '#1a1a2e';
            const accentColor = m.accentColor || '#0003c9';
            document.documentElement.innerHTML = '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>صيانة - QCV</title><link rel="icon" type="image/png" href="https://i.postimg.cc/L59BQSvq/qcv-app-icon-final.png"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:' + bgColor + ';color:' + textColor + ";font-family:'Inter','Cairo',sans-serif;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;position:relative;overflow:hidden}body::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 40%," + accentColor + "08 0%,transparent 50%),radial-gradient(circle at 70% 60%," + accentColor + "05 0%,transparent 50%);animation:bgFloat 20s ease-in-out infinite}@keyframes bgFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(-2%,2%)}}.box{max-width:520px;position:relative;z-index:1}.logo{font-size:2.2rem;font-weight:900;margin-bottom:24px;letter-spacing:-1px}.logo span{color:" + accentColor + ";}.icon-wrap{width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg," + accentColor + "12," + accentColor + "06);display:flex;align-items:center;justify-content:center;margin:0 auto 28px;border:2px solid " + accentColor + "15;position:relative}.icon-wrap::after{content:'';position:absolute;inset:-8px;border-radius:50%;border:1px dashed " + accentColor + "20;animation:spin 30s linear infinite}.icon{font-size:3.5rem;opacity:0.8;animation:float 3s ease-in-out infinite}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes spin{to{transform:rotate(360deg)}}h1{font-size:1.8rem;font-weight:900;margin-bottom:12px;line-height:1.3}.timer{display:inline-flex;gap:12px;margin:20px 0}.timer-block{background:" + accentColor + "08;border:1px solid " + accentColor + "15;border-radius:12px;padding:12px 16px;min-width:70px}.timer-num{font-size:1.8rem;font-weight:900;color:" + accentColor + ";display:block;line-height:1}.timer-label{font-size:0.65rem;color:#6b7280;font-weight:600;text-transform:uppercase;margin-top:4px}p{color:#6b7280;font-size:1rem;line-height:1.8;max-width:400px;margin:0 auto 24px}.social{display:flex;gap:12px;justify-content:center;margin-top:8px}.social a{width:44px;height:44px;border-radius:12px;border:1px solid " + accentColor + "15;display:flex;align-items:center;justify-content:center;color:#6b7280;text-decoration:none;transition:all 0.2s;font-size:1.1rem}.social a:hover{background:" + accentColor + "08;color:" + accentColor + ";border-color:" + accentColor + "30}.badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;background:" + accentColor + "08;border:1px solid " + accentColor + "15;font-size:0.75rem;font-weight:700;color:" + accentColor + ";margin-bottom:20px}.badge .dot{width:6px;height:6px;border-radius:50%;background:" + accentColor + ";animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@media(max-width:480px){.timer{gap:8px}.timer-block{padding:10px 12px;min-width:60px}.timer-num{font-size:1.4rem}h1{font-size:1.4rem}}</style></head><body><div class=\"box\"><div class=\"logo\">Q<span>CV</span></div><div class=\"icon-wrap\"><div class=\"icon\">\u{1F527}</div></div><div class=\"badge\"><span class=\"dot\"></span>Under Maintenance</div><h1>\u0627\u0644\u0645\u0648\u0642\u0639 \u0642\u064A\u062F \u0627\u0644\u0635\u064A\u0627\u0646\u0629</h1><p>' + msg + '</p><div class=\"timer\"><div class=\"timer-block\"><span class=\"timer-num\" id=\"td\">--</span><span class=\"timer-label\">Days</span></div><div class=\"timer-block\"><span class=\"timer-num\" id=\"th\">--</span><span class=\"timer-label\">Hours</span></div><div class=\"timer-block\"><span class=\"timer-num\" id=\"tm\">--</span><span class=\"timer-label\">Mins</span></div><div class=\"timer-block\"><span class=\"timer-num\" id=\"ts\">--</span><span class=\"timer-label\">Secs</span></div></div><div class=\"social\"><a href=\"https://wa.me/201028707543\" title=\"WhatsApp\"><i class=\"fab fa-whatsapp\"></i></a><a href=\"mailto:support@qcv.vexonet.online\" title=\"Email\"><i class=\"fas fa-envelope\"></i></a><a href=\"https://qcv.vexonet.online\" title=\"Home\"><i class=\"fas fa-home\"></i></a></div></div><script>var end=(Date.now()+(m.estimatedHours||24)*3600000);function tick(){var d=Math.max(0,Math.floor((end-Date.now())/86400000));var h=Math.max(0,Math.floor(((end-Date.now())%86400000)/3600000));var m2=Math.max(0,Math.floor(((end-Date.now())%3600000)/60000));var s=Math.max(0,Math.floor(((end-Date.now())%60000)/1000));document.getElementById('td').textContent=d;document.getElementById('th').textContent=h;document.getElementById('tm').textContent=m2;document.getElementById('ts').textContent=s}tick();setInterval(tick,1000)</script></body>'; 
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
            get geminiKey() { return adminSettings.geminiKey || ''; },
            get naraKey() { return adminSettings.naraKey || ''; },
            get: function() { return { ...siteData, ...adminSettings }; },
            forceRefresh: function() {
                fetch('https://qwcv-1cfad-default-rtdb.firebaseio.com/siteSettings.json')
                    .then(r => r.json())
                    .then(data => { siteData = data || {}; applyAll(); })
                    .catch(() => {});
            }
        };
    `;
    document.head.appendChild(script);
})();
