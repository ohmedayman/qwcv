/**
 * QCV Corporate Engine
 * Navigation, Routing Sync, Auth-Aware Controls, Active State & Telemetry.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupScrollProgress();
    setupStickyNav();
    setupMobileMenu();
    setupActivePageHighlighting();
    setupSectionObserver();
    setupPlatformPreviewTabs();
    setupLiveTelemetrySimulation();
    setupInteractiveNodes();
    setupAuthAwareNav();
  }

  /* ==========================================================================
     1. Scroll Progress Bar
     ========================================================================== */
  function setupScrollProgress() {
    const progressBar = document.querySelector('.scroll-progress');
    if (!progressBar) return;

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight > 0) {
        const scrolled = (scrollTop / docHeight) * 100;
        progressBar.style.width = `${scrolled}%`;
      }
    }, { passive: true });
  }

  /* ==========================================================================
     2. Sticky Header Background Transition
     ========================================================================== */
  function setupStickyNav() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const onScroll = () => {
      if (window.scrollY > 24) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ==========================================================================
     3. Mobile Navigation Drawer (Click-to-close & smooth navigate)
     ========================================================================== */
  function setupMobileMenu() {
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    const drawer = document.querySelector('.mobile-drawer');
    if (!toggleBtn || !drawer) return;

    function openDrawer() {
      drawer.classList.add('open');
      toggleBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = drawer.classList.contains('open');
      if (isOpen) closeDrawer();
      else openDrawer();
    });

    // Close when clicking any nav link in drawer
    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (drawer.classList.contains('open') && !drawer.contains(e.target) && !toggleBtn.contains(e.target)) {
        closeDrawer();
      }
    });
  }

  /* ==========================================================================
     4. Active Page Highlighting (Based on URL pathname & in-page anchors)
     ========================================================================== */
  function setupActivePageHighlighting() {
    const navLinks = document.querySelectorAll('.nav-link');
    if (!navLinks.length) return;

    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const isRoot = currentPath === '/' || currentPath.endsWith('index.html');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const normalizedHref = href.replace(/\/$/, '') || '/';

      // Match exact path or root index
      if (!isRoot && normalizedHref === currentPath) {
        link.classList.add('active');
      } else if (isRoot && (href === '/' || href === '/#home' || href === '#home')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // In-page anchor scroll tracking if on root page
    if (isRoot) {
      const sections = document.querySelectorAll('section[id]');
      if (!sections.length) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const currentId = entry.target.getAttribute('id');
            navLinks.forEach(link => {
              const href = link.getAttribute('href');
              if (href === `#${currentId}` || href === `/#${currentId}`) {
                link.classList.add('active');
              } else if (href && href.startsWith('#')) {
                link.classList.remove('active');
              }
            });
          }
        });
      }, {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
      });

      sections.forEach(sec => observer.observe(sec));
    }
  }

  /* ==========================================================================
     5. Intersection Observer for Fade-In Animations
     ========================================================================== */
  function setupSectionObserver() {
    const elements = document.querySelectorAll('.fade-in-section');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.1
    });

    elements.forEach(el => observer.observe(el));
  }

  /* ==========================================================================
     6. Product / Platform Preview Tabs
     ========================================================================== */
  function setupPlatformPreviewTabs() {
    const tabButtons = document.querySelectorAll('.dash-tab-btn');
    if (!tabButtons.length) return;

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.dataset.tab;
        updateDashboardView(mode);
      });
    });
  }

  function updateDashboardView(mode) {
    const throughputVal = document.getElementById('dash-throughput-val');
    const latencyVal = document.getElementById('dash-latency-val');
    const chartPath = document.getElementById('telemetry-chart-path');

    if (!throughputVal || !latencyVal) return;

    if (mode === 'telemetry') {
      throughputVal.innerHTML = '3.8M <span class="dash-stat-badge">req/s</span>';
      latencyVal.innerHTML = '9.8ms <span class="dash-stat-badge">p99</span>';
      if (chartPath) {
        chartPath.setAttribute('d', 'M0,140 Q100,60 200,90 T400,40 T600,60 T800,20 L800,180 L0,180 Z');
      }
    } else if (mode === 'services') {
      throughputVal.innerHTML = '100% <span class="dash-stat-badge">Healthy</span>';
      latencyVal.innerHTML = '6 / 6 <span class="dash-stat-badge">Regions</span>';
      if (chartPath) {
        chartPath.setAttribute('d', 'M0,120 Q120,110 240,115 T480,105 T720,110 T800,100 L800,180 L0,180 Z');
      }
    } else if (mode === 'activity') {
      throughputVal.innerHTML = '42k <span class="dash-stat-badge">Events/m</span>';
      latencyVal.innerHTML = 'Zero <span class="dash-stat-badge">Dropped</span>';
      if (chartPath) {
        chartPath.setAttribute('d', 'M0,150 Q100,100 200,120 T400,70 T600,110 T800,50 L800,180 L0,180 Z');
      }
    } else {
      throughputVal.innerHTML = '2.4M <span class="dash-stat-badge">req/s</span>';
      latencyVal.innerHTML = '12.4ms <span class="dash-stat-badge">p99</span>';
      if (chartPath) {
        chartPath.setAttribute('d', 'M0,130 Q120,70 240,110 T480,50 T720,80 T800,40 L800,180 L0,180 Z');
      }
    }
  }

  /* ==========================================================================
     7. Live Simulation & Heartbeat Updates
     ========================================================================== */
  function setupLiveTelemetrySimulation() {
    const liveTimeElements = document.querySelectorAll('.live-timestamp');
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      liveTimeElements.forEach(el => {
        el.textContent = timeStr;
      });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  /* ==========================================================================
     8. 2D Architecture Canvas Node Interactivity
     ========================================================================== */
  function setupInteractiveNodes() {
    const nodes = document.querySelectorAll('.canvas-node');
    const lines = document.querySelectorAll('.network-line');

    nodes.forEach(node => {
      node.addEventListener('mouseenter', () => {
        node.classList.add('highlighted');
        lines.forEach(l => l.classList.add('active'));
      });
      node.addEventListener('mouseleave', () => {
        node.classList.remove('highlighted');
      });
    });
  }

  /* ==========================================================================
     9. Authentication-Aware Navigation (Section 17)
     ========================================================================== */
  function setupAuthAwareNav() {
    // Check if Firebase Auth is loaded or stored in local storage
    const checkAuthState = () => {
      let isAuthenticated = false;

      // 1. Check window.firebase
      if (window.firebase && window.firebase.auth) {
        try {
          const currentUser = window.firebase.auth().currentUser;
          if (currentUser) isAuthenticated = true;
        } catch (e) {}
      }

      // 2. Check localStorage / sessionStorage for Firebase Auth token
      if (!isAuthenticated) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('firebase:authUser:')) {
              const val = localStorage.getItem(key);
              if (val && val !== 'null') {
                isAuthenticated = true;
                break;
              }
            }
          }
        } catch (e) {}
      }

      applyNavState(isAuthenticated);
    };

    // Apply UI transformation
    function applyNavState(isLoggedIn) {
      const navActions = document.querySelector('.nav-actions');
      const mobileDrawer = document.querySelector('.mobile-drawer');

      if (!navActions) return;

      const loginBtn = navActions.querySelector('a[href*="login"]');
      const getStartedBtn = navActions.querySelector('a.btn-primary');

      if (isLoggedIn) {
        // Change login link to Dashboard
        if (loginBtn) {
          loginBtn.textContent = 'Dashboard';
          loginBtn.setAttribute('href', '/dashboard');
        } else {
          // If no loginBtn was there, make primary CTA point to Dashboard
          if (getStartedBtn) {
            getStartedBtn.innerHTML = `<span>Dashboard</span><svg class="btn-icon-arrow" viewBox="0 0 14 14" fill="none"><path d="M1 7H13M13 7L7.5 1.5M13 7L7.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            getStartedBtn.setAttribute('href', '/dashboard');
          }
        }

        // Add Logout button if not already added
        if (!navActions.querySelector('.btn-logout-nav')) {
          const logoutBtn = document.createElement('button');
          logoutBtn.type = 'button';
          logoutBtn.className = 'btn btn-secondary btn-logout-nav';
          logoutBtn.style.padding = '8px 16px';
          logoutBtn.style.fontSize = '0.8125rem';
          logoutBtn.textContent = 'Sign out';
          logoutBtn.onclick = handleSignOut;
          navActions.appendChild(logoutBtn);
        }

        // Update mobile drawer
        if (mobileDrawer) {
          const drawerLogin = mobileDrawer.querySelector('a[href*="login"]');
          if (drawerLogin) {
            drawerLogin.textContent = 'Dashboard';
            drawerLogin.setAttribute('href', '/dashboard');
          }
          if (!mobileDrawer.querySelector('.drawer-logout-btn')) {
            const drawerLogout = document.createElement('a');
            drawerLogout.href = '#logout';
            drawerLogout.className = 'nav-link drawer-logout-btn';
            drawerLogout.textContent = 'Sign out';
            drawerLogout.onclick = (e) => {
              e.preventDefault();
              handleSignOut();
            };
            mobileDrawer.appendChild(drawerLogout);
          }
        }
      }
    }

    function handleSignOut() {
      if (window.firebase && window.firebase.auth) {
        window.firebase.auth().signOut().then(() => {
          window.location.reload();
        }).catch(() => {
          clearLocalAuthAndReload();
        });
      } else {
        clearLocalAuthAndReload();
      }
    }

    function clearLocalAuthAndReload() {
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('firebase:authUser:')) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
      window.location.reload();
    }

    // Initial check
    checkAuthState();

    // Listen to Firebase auth changes if available
    if (window.firebase && window.firebase.auth) {
      try {
        window.firebase.auth().onAuthStateChanged((user) => {
          applyNavState(!!user);
        });
      } catch (e) {}
    }
  }

})();
