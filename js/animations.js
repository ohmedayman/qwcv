// ===== QCV ANIMATIONS ENGINE =====
// Scroll Reveal, Typing Effect, Parallax, Counters, Popups, Hover Effects

(function() {
    'use strict';

    // ===== SCROLL REVEAL =====
    function initScrollReveal() {
        var reveals = document.querySelectorAll('[data-reveal]');
        if (!reveals.length) {
            // Auto-add reveal to common elements
            var selectors = '.feature-card, .step, .price-card, .test-card-new, .faq-item, .stat, .partner-card, .section-header';
            document.querySelectorAll(selectors).forEach(function(el, i) {
                el.setAttribute('data-reveal', 'up');
                el.style.transitionDelay = (i % 4) * 0.08 + 's';
            });
            reveals = document.querySelectorAll('[data-reveal]');
        }

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    var el = entry.target;
                    var dir = el.getAttribute('data-reveal') || 'up';
                    el.classList.add('revealed');
                    el.style.opacity = '1';
                    el.style.transform = 'translate(0,0) scale(1)';
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        reveals.forEach(function(el) {
            var dir = el.getAttribute('data-reveal');
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)';
            switch(dir) {
                case 'up': el.style.transform = 'translateY(30px)'; break;
                case 'down': el.style.transform = 'translateY(-30px)'; break;
                case 'left': el.style.transform = 'translateX(-40px)'; break;
                case 'right': el.style.transform = 'translateX(40px)'; break;
                case 'scale': el.style.transform = 'scale(0.9)'; break;
                case 'fade': el.style.transform = 'none'; break;
                default: el.style.transform = 'translateY(30px)';
            }
            observer.observe(el);
        });
    }

    // ===== TYPING EFFECT =====
    function initTypingEffect() {
        var el = document.querySelector('[data-typing]');
        if (!el) return;
        var texts = (el.getAttribute('data-typing') || '').split('|');
        if (texts.length < 2) return;
        var textIdx = 0, charIdx = 0, deleting = false;
        el.style.borderRight = '2px solid var(--accent)';

        function tick() {
            var current = texts[textIdx];
            if (!deleting) {
                el.textContent = current.substring(0, charIdx + 1);
                charIdx++;
                if (charIdx === current.length) {
                    deleting = true;
                    setTimeout(tick, 2000);
                    return;
                }
                setTimeout(tick, 80);
            } else {
                el.textContent = current.substring(0, charIdx - 1);
                charIdx--;
                if (charIdx === 0) {
                    deleting = false;
                    textIdx = (textIdx + 1) % texts.length;
                    setTimeout(tick, 400);
                    return;
                }
                setTimeout(tick, 40);
            }
        }
        setTimeout(tick, 1000);
    }

    // ===== ANIMATED COUNTERS =====
    function initCounters() {
        var counters = document.querySelectorAll('.stat-num[data-target]');
        if (!counters.length) return;
        var animated = false;

        function animateCounters() {
            counters.forEach(function(counter) {
                var target = parseFloat(counter.dataset.target);
                var prefix = counter.dataset.prefix || '';
                var suffix = counter.dataset.suffix || '';
                var duration = 2000;
                var startTime = performance.now();
                var isFloat = target % 1 !== 0;

                function update(currentTime) {
                    var elapsed = currentTime - startTime;
                    var progress = Math.min(elapsed / duration, 1);
                    var eased = 1 - Math.pow(1 - progress, 3);
                    var current = eased * target;
                    if (target >= 1000) {
                        counter.textContent = prefix + Math.floor(current / 1000) + 'K' + suffix;
                    } else if (isFloat) {
                        counter.textContent = prefix + current.toFixed(1) + suffix;
                    } else {
                        counter.textContent = prefix + Math.floor(current) + suffix;
                    }
                    if (progress < 1) requestAnimationFrame(update);
                }
                requestAnimationFrame(update);
            });
        }

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && !animated) {
                    animated = true;
                    animateCounters();
                }
            });
        }, { threshold: 0.3 });
        var statsBar = document.querySelector('.stats-bar');
        if (statsBar) observer.observe(statsBar);
    }

    // ===== PARALLAX on Hero =====
    function initParallax() {
        var hero = document.querySelector('.hero');
        if (!hero) return;
        window.addEventListener('scroll', function() {
            var scrollY = window.scrollY;
            if (scrollY < window.innerHeight) {
                var visual = hero.querySelector('.hero-visual');
                if (visual) {
                    visual.style.transform = 'translateY(' + (scrollY * 0.08) + 'px)';
                }
                var badge = hero.querySelector('.hero-badge');
                if (badge) {
                    badge.style.transform = 'translateY(' + (scrollY * 0.05) + 'px)';
                }
            }
        }, { passive: true });
    }

    // ===== FLOATING PARTICLES on Hero =====
    function initParticles() {
        var hero = document.querySelector('.hero');
        if (!hero) return;
        var container = document.createElement('div');
        container.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1';
        hero.insertBefore(container, hero.firstChild);

        for (var i = 0; i < 20; i++) {
            var p = document.createElement('div');
            var size = 3 + Math.random() * 6;
            var x = Math.random() * 100;
            var delay = Math.random() * 10;
            var duration = 15 + Math.random() * 20;
            var opacity = 0.05 + Math.random() * 0.1;
            p.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;background:var(--accent);border-radius:50%;opacity:' + opacity + ';left:' + x + '%;bottom:-20px;animation:particleFloat ' + duration + 's ' + delay + 's linear infinite';
            container.appendChild(p);
        }

        var style = document.createElement('style');
        style.textContent = '@keyframes particleFloat{0%{transform:translateY(0) translateX(0)}25%{transform:translateY(-25vh) translateX(15px)}50%{transform:translateY(-50vh) translateX(-10px)}75%{transform:translateY(-75vh) translateX(20px)}100%{transform:translateY(-100vh) translateX(0);opacity:0}}';
        document.head.appendChild(style);
    }

    // ===== TEMPLATE PREVIEW POPUP =====
    window.showTemplatePreview = function(templateName, thumbnailUrl) {
        var overlay = document.createElement('div');
        overlay.className = 'qcv-popup-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);animation:popupFadeIn 0.3s ease;cursor:pointer';

        var popup = document.createElement('div');
        popup.style.cssText = 'background:var(--card,#fff);border-radius:20px;max-width:700px;width:100%;max-height:85vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.3);animation:popupSlideUp 0.3s cubic-bezier(0.16,1,0.3,1);cursor:default;position:relative';

        popup.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border,#e5e7eb)">' +
            '<h3 style="font-size:1rem;font-weight:800;margin:0;color:var(--text,#1a1a2e)">' + (templateName || 'Template Preview') + '</h3>' +
            '<button onclick="this.closest(\'.qcv-popup-overlay\').remove()" style="width:32px;height:32px;border:none;border-radius:8px;background:var(--bg2,#f3f4f6);cursor:pointer;font-size:1rem;color:var(--muted,#6b7280);display:flex;align-items:center;justify-content:center">&times;</button></div>' +
            '<div style="padding:20px;text-align:center">' +
            (thumbnailUrl ? '<img src="' + thumbnailUrl + '" alt="' + templateName + '" style="max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1)">' : '<div style="padding:60px 20px;color:var(--muted,#6b7280)"><i class="fas fa-file-alt" style="font-size:3rem;margin-bottom:12px;opacity:0.3;display:block"></i>Template preview loading...</div>') +
            '</div>' +
            '<div style="padding:12px 20px;border-top:1px solid var(--border,#e5e7eb);display:flex;gap:10px;justify-content:flex-end">' +
            '<a href="login.html" style="padding:10px 24px;background:var(--accent,#0003c9);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.85rem;cursor:pointer;text-decoration:none">Use This Template</a></div>';

        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
                document.body.style.overflow = '';
            }
        });

        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handler);
            }
        });
    };

    // ===== GLOBAL POPUP SYSTEM =====
    window.qcvPopup = function(opts) {
        var overlay = document.createElement('div');
        overlay.className = 'qcv-popup-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);animation:popupFadeIn 0.25s ease;cursor:pointer';

        var popup = document.createElement('div');
        popup.style.cssText = 'background:var(--card,#fff);border-radius:18px;max-width:' + (opts.width || '500px') + ';width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,0.25);animation:popupSlideUp 0.3s cubic-bezier(0.16,1,0.3,1);cursor:default;position:relative';

        var header = opts.title ? '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border,#e5e7eb)"><h3 style="font-size:1rem;font-weight:800;margin:0">' + opts.title + '</h3><button class="qcv-popup-close" style="width:32px;height:32px;border:none;border-radius:8px;background:var(--bg2,#f3f4f6);cursor:pointer;font-size:1rem;color:var(--muted,#6b7280);display:flex;align-items:center;justify-content:center">&times;</button></div>' : '';

        popup.innerHTML = header + '<div style="padding:20px">' + (opts.body || '') + '</div>';
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        function close() {
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(0.95)';
            overlay.style.transition = 'all 0.2s ease';
            setTimeout(function() { overlay.remove(); document.body.style.overflow = ''; }, 200);
        }

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay || e.target.classList.contains('qcv-popup-close')) close();
        });
        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
        });

        return { close: close };
    };

    // ===== MAGNETIC BUTTONS =====
    function initMagneticButtons() {
        document.querySelectorAll('.btn-primary, .btn-cta, .btn-plan-pro').forEach(function(btn) {
            btn.addEventListener('mousemove', function(e) {
                var rect = btn.getBoundingClientRect();
                var x = e.clientX - rect.left - rect.width / 2;
                var y = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = 'translate(' + (x * 0.15) + 'px,' + (y * 0.15) + 'px)';
            });
            btn.addEventListener('mouseleave', function() {
                btn.style.transform = '';
                btn.style.transition = 'transform 0.3s cubic-bezier(0.16,1,0.3,1)';
            });
        });
    }

    // ===== SMOOTH ANCHOR SCROLL =====
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function(a) {
            a.addEventListener('click', function(e) {
                var target = document.querySelector(a.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ===== NAVBAR SCROLL EFFECT =====
    function initNavbarScroll() {
        var navbar = document.querySelector('.navbar');
        if (!navbar) return;
        var lastScroll = 0;
        window.addEventListener('scroll', function() {
            var scrollY = window.scrollY;
            if (scrollY > 100) {
                navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.06)';
                navbar.style.borderBottomColor = 'transparent';
            } else {
                navbar.style.boxShadow = '';
                navbar.style.borderBottomColor = '';
            }
            lastScroll = scrollY;
        }, { passive: true });
    }

    // ===== RIPPLE EFFECT on buttons =====
    function initRipple() {
        document.addEventListener('click', function(e) {
            var btn = e.target.closest('.btn, .btn-primary, .btn-plan, .nav-cta');
            if (!btn) return;
            var rect = btn.getBoundingClientRect();
            var ripple = document.createElement('span');
            var size = Math.max(rect.width, rect.height) * 2;
            ripple.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:rgba(255,255,255,0.3);transform:translate(-50%,-50%) scale(0);animation:rippleEffect 0.6s ease-out;pointer-events:none;left:' + (e.clientX - rect.left) + 'px;top:' + (e.clientY - rect.top) + 'px';
            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            btn.appendChild(ripple);
            setTimeout(function() { ripple.remove(); }, 600);
        });

        var style = document.createElement('style');
        style.textContent = '@keyframes rippleEffect{to{transform:translate(-50%,-50%) scale(1);opacity:0}}';
        document.head.appendChild(style);
    }

    // ===== LOADING SCREEN =====
    function initLoadingScreen() {
        var loader = document.createElement('div');
        loader.id = 'qcvLoader';
        loader.style.cssText = 'position:fixed;inset:0;background:var(--bg,#fff);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity 0.4s ease';
        loader.innerHTML = '<div style="font-size:2.5rem;font-weight:900;color:var(--text,#1a1a2e);margin-bottom:20px">Q<span style="color:var(--accent,#0003c9)">CV</span></div>' +
            '<div style="width:40px;height:40px;border:3px solid var(--border,#e5e7eb);border-top-color:var(--accent,#0003c9);border-radius:50%;animation:qcvSpin 0.8s linear infinite"></div>';
        document.body.prepend(loader);

        var style = document.createElement('style');
        style.textContent = '@keyframes qcvSpin{to{transform:rotate(360deg)}}';
        document.head.appendChild(style);

        window.addEventListener('load', function() {
            setTimeout(function() {
                loader.style.opacity = '0';
                setTimeout(function() { loader.remove(); }, 400);
            }, 300);
        });
    }

    // ===== CSS ANIMATIONS (injected) =====
    function injectAnimationCSS() {
        var style = document.createElement('style');
        style.textContent = [
            '@keyframes popupFadeIn{from{opacity:0}to{opacity:1}}',
            '@keyframes popupSlideUp{from{opacity:0;transform:translateY(30px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}',
            '@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}',
            '@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}',
            '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}',
            '@keyframes glow{0%,100%{box-shadow:0 0 5px rgba(0,3,201,0.2)}50%{box-shadow:0 0 20px rgba(0,3,201,0.4)}}'
        ].join('\n');
        document.head.appendChild(style);
    }

    // ===== INIT ALL =====
    function init() {
        injectAnimationCSS();
        initLoadingScreen();
        initScrollReveal();
        initTypingEffect();
        initCounters();
        initParallax();
        initParticles();
        initMagneticButtons();
        initSmoothScroll();
        initNavbarScroll();
        initRipple();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.QCVAnimations = {
        popup: window.qcvPopup,
        showTemplatePreview: window.showTemplatePreview
    };

})();
