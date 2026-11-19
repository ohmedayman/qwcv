(function () {
    if (!document || !document.body || !document.documentElement) return;

    const script = document.currentScript;
    const isEnglish = (document.documentElement.lang || '').toLowerCase().startsWith('en') || location.pathname.startsWith('/en/');
    const text = isEnglish
        ? { home: 'Workspace', editor: 'CV builder', templates: 'Templates', ai: 'AI assistant', aiTools: 'AI tools', ats: 'ATS check', tracker: 'Job tracker', billing: 'Plans', blog: 'Guides', help: 'Help', login: 'Sign in', about: 'About', contact: 'Contact', privacy: 'Privacy', terms: 'Terms' }
        : { home: 'الرئيسية', editor: 'المحرر', templates: 'القوالب', ai: 'مساعد AI', aiTools: 'أدوات AI', ats: 'تحليل ATS', tracker: 'الوظائف', billing: 'الباقات', blog: 'المقالات', help: 'المساعدة', login: 'تسجيل الدخول', about: 'من نحن', contact: 'تواصل معنا', privacy: 'الخصوصية', terms: 'الشروط' };
    const localePath = (file) => (isEnglish ? '/en/' : '/') + file;
    const pathPage = location.pathname.split('/').pop().replace(/\.html$/, '');
    const inferredPages = { index: 'home', pricing: 'billing', pay: 'billing', 'ai-tools': 'aiTools', 'ats-checker': 'ats', templates: 'templates' };
    const currentPage = (script && script.dataset.page) || inferredPages[pathPage] || pathPage;
    const navItems = [
        { id: 'home', href: '/app', icon: 'fa-grid-2', label: text.home },
        { id: 'editor', href: '/editor.html', icon: 'fa-file-pen', label: text.editor },
        { id: 'templates', href: localePath('templates.html'), icon: 'fa-layer-group', label: text.templates },
        { id: 'ai', href: '/ai.html', icon: 'fa-wand-magic-sparkles', label: text.ai },
        { id: 'aiTools', href: localePath('ai-tools.html'), icon: 'fa-toolbox', label: text.aiTools },
        { id: 'ats', href: localePath('ats-checker.html'), icon: 'fa-chart-simple', label: text.ats },
        { id: 'tracker', href: '/tracker.html', icon: 'fa-list-check', label: text.tracker },
        { id: 'billing', href: localePath(isEnglish ? 'pricing.html' : 'pay.html'), icon: 'fa-credit-card', label: text.billing },
        { id: 'blog', href: localePath('blog.html'), icon: 'fa-book-open', label: text.blog },
        { id: 'help', href: localePath('help.html'), icon: 'fa-circle-question', label: text.help }
    ];

    function makeNavLink(item, mobile) {
        const link = document.createElement('a');
        link.href = item.href;
        link.className = (currentPage === item.id ? 'active ' : '') + (mobile ? 'app-mobile-link' : 'app-desktop-link');
        if (currentPage === item.id) link.setAttribute('aria-current', 'page');
        const icon = document.createElement('i');
        icon.className = 'fas ' + item.icon;
        icon.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.textContent = item.label;
        link.append(icon, label);
        return link;
    }

    function mount() {
        if (!document.body || !document.querySelector || document.querySelector('.app-global-nav')) return;
        const legacyNav = document.querySelector('body > nav.navbar, body > nav.nav');
        const needsHeaderOffset = !legacyNav || getComputedStyle(legacyNav).position !== 'fixed';
        const legacyNavHeight = legacyNav ? Math.ceil(legacyNav.getBoundingClientRect().height) : 64;
        document.body.classList.add('app-chrome-page');
        document.body.dataset.appPage = currentPage;
        if (legacyNav) legacyNav.remove();
        document.querySelectorAll('body > footer.footer').forEach((footer) => footer.remove());

        const header = document.createElement('header');
        header.className = 'app-global-nav';
        header.dir = isEnglish ? 'ltr' : 'rtl';
        header.innerHTML = '<a class="app-global-brand" href="/" aria-label="QCV"><span>Q</span>CV</a><nav class="app-global-links"></nav><div class="app-global-actions"><button class="app-global-theme theme-toggle" type="button" aria-label="' + (isEnglish ? 'Toggle appearance' : 'تغيير المظهر') + '" title="' + (isEnglish ? 'Toggle appearance' : 'تغيير المظهر') + '"><span class="icon-sun">☀</span><span class="icon-moon" style="display:none">☾</span></button><a class="app-global-account" href="/login.html">' + text.login + '</a><button class="app-global-menu" type="button" aria-expanded="false"><i class="fas fa-bars"></i></button></div>';
        const desktopLinks = header.querySelector('.app-global-links');
        desktopLinks.setAttribute('aria-label', isEnglish ? 'Primary navigation' : 'التنقل الرئيسي');
        navItems.forEach((item) => desktopLinks.appendChild(makeNavLink(item, false)));

        const mobileNav = document.createElement('nav');
        mobileNav.className = 'app-global-mobile-nav';
        mobileNav.dir = isEnglish ? 'ltr' : 'rtl';
        mobileNav.setAttribute('aria-label', isEnglish ? 'Quick navigation' : 'التنقل السريع');
        navItems.filter((item) => ['home', 'editor', 'templates', 'ai', 'tracker'].includes(item.id)).forEach((item) => mobileNav.appendChild(makeNavLink(item, true)));

        const footer = document.createElement('footer');
        footer.className = 'app-global-footer';
        footer.dir = isEnglish ? 'ltr' : 'rtl';
        footer.innerHTML = '<span class="footer-copy">© ' + new Date().getFullYear() + ' QCV</span><div><a href="' + localePath('about.html') + '">' + text.about + '</a><a href="' + localePath('contact.html') + '">' + text.contact + '</a><a href="' + localePath('help.html') + '">' + text.help + '</a><a href="' + localePath('privacy.html') + '">' + text.privacy + '</a><a href="' + localePath('terms.html') + '">' + text.terms + '</a></div>';

        header.querySelector('.app-global-theme').addEventListener('click', () => {
            if (window.QCVTheme) window.QCVTheme.toggle();
            else document.body.classList.toggle('dark-mode');
        });
        const menuButton = header.querySelector('.app-global-menu');
        menuButton.setAttribute('aria-label', isEnglish ? 'Open navigation' : 'فتح التنقل');
        menuButton.addEventListener('click', () => {
            const open = header.classList.toggle('menu-open');
            menuButton.setAttribute('aria-expanded', String(open));
        });

        document.body.prepend(header);
        if (needsHeaderOffset) {
            const spacer = document.createElement('div');
            spacer.className = 'app-global-offset';
            spacer.setAttribute('aria-hidden', 'true');
            spacer.style.height = legacyNavHeight + 'px';
            header.after(spacer);
        }
        document.body.append(mobileNav, footer);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();
})();
