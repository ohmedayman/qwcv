/**
 * QCV Landing Page Interactive Client Logic
 * Mobile Drawer, Theme Toggle, Pricing Toggle, FAQ Accordion, Animated Mockup, Analytics
 */

(function () {
  'use strict';

  // 1. MOBILE DRAWER TOGGLE
  const menuBtn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileDrawer');
  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', function () {
      const isOpen = drawer.classList.toggle('active');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
    });
    // Close on link click
    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => drawer.classList.remove('active'));
    });
  }

  // 2. THEME TOGGLE (Dark/Light)
  const themeBtn = document.getElementById('themeToggleBtn');
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('qcv_theme', t);
    if (themeBtn) {
      themeBtn.innerHTML = t === 'dark' 
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      themeBtn.setAttribute('aria-label', t === 'dark' ? 'تبديل للوضع الفاتح' : 'تبديل للوضع الداكن');
    }
  }

  const savedTheme = localStorage.getItem('qcv_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
      trackEvent('theme_toggle', { new_theme: current === 'dark' ? 'light' : 'dark' });
    });
  }

  // 3. PRICING MONTHLY / ANNUAL TOGGLE
  const billingToggle = document.getElementById('billingToggle');
  const proAmount = document.getElementById('proAmount');
  const unlimitedAmount = document.getElementById('unlimitedAmount');
  const proPeriod = document.getElementById('proPeriod');
  const unlimitedPeriod = document.getElementById('unlimitedPeriod');

  if (billingToggle) {
    billingToggle.addEventListener('click', function () {
      const isAnnual = billingToggle.classList.toggle('annual');
      billingToggle.setAttribute('aria-checked', String(isAnnual));

      if (isAnnual) {
        if (proAmount) proAmount.textContent = '79 ج.م';
        if (proPeriod) proPeriod.textContent = '/شهر (تدفع سنوياً)';
        if (unlimitedAmount) unlimitedAmount.textContent = '239 ج.م';
        if (unlimitedPeriod) unlimitedPeriod.textContent = '/شهر (تدفع سنوياً)';
      } else {
        if (proAmount) proAmount.textContent = '99 ج.م';
        if (proPeriod) proPeriod.textContent = '/شهرياً';
        if (unlimitedAmount) unlimitedAmount.textContent = '299 ج.م';
        if (unlimitedPeriod) unlimitedPeriod.textContent = '/شهرياً';
      }
      trackEvent('pricing_toggle', { plan_type: isAnnual ? 'annual' : 'monthly' });
    });
  }

  // 4. FAQ ACCORDION
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const qBtn = item.querySelector('.faq-question');
    if (qBtn) {
      qBtn.addEventListener('click', function () {
        const isActive = item.classList.contains('active');
        // Close all
        faqItems.forEach(i => {
          i.classList.remove('active');
          const btn = i.querySelector('.faq-question');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        });

        if (!isActive) {
          item.classList.add('active');
          qBtn.setAttribute('aria-expanded', 'true');
          trackEvent('faq_open', { question: qBtn.textContent.trim() });
        }
      });
    }
  });

  // 5. ANIMATED TYPING MOCKUP (Hero section simulation)
  const typingEl = document.getElementById('heroTypingSummary');
  if (typingEl) {
    const sampleTextAr = 'مهندس برمجيات ذو خبرة 5 سنوات في تطوير تطبيقات الويب، قمت بزيادة كفاءة الأنظمة بنسبة 35% وقيادة فريق من 4 مهندسين...';
    let charIdx = 0;
    function typeChar() {
      if (charIdx < sampleTextAr.length) {
        typingEl.textContent += sampleTextAr.charAt(charIdx);
        charIdx++;
        setTimeout(typeChar, 45);
      } else {
        setTimeout(() => {
          typingEl.textContent = '';
          charIdx = 0;
          typeChar();
        }, 5000);
      }
    }
    // Start after slight delay
    setTimeout(typeChar, 1000);
  }

  // 6. STICKY HEADER SHADOW ON SCROLL
  const header = document.getElementById('siteHeader');
  if (header) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 30) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // 7. CONVERSION TRACKING LAYER
  function trackEvent(eventName, params = {}) {
    try {
      if (window.gtag) {
        window.gtag('event', eventName, params);
      }
      if (window.dataLayer) {
        window.dataLayer.push({ event: eventName, ...params });
      }
      console.log(`[QCV Analytics] Event: ${eventName}`, params);
    } catch (_) {}
  }

  // Track CTA clicks
  document.querySelectorAll('a[href*="login.html"], a[href*="ats-checker.html"]').forEach(btn => {
    btn.addEventListener('click', function () {
      const ctaType = this.getAttribute('href').includes('login') ? 'primary_start_cv' : 'secondary_check_ats';
      const label = this.textContent.trim();
      trackEvent('cta_click', { cta_type: ctaType, label: label });
    });
  });

  // Expose global track helper
  window.QCVTrack = trackEvent;
})();
