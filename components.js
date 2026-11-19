/**
 * QCV Shared Components & Global Runtime
 * Provides unified authentication state, UI synchronization, Toast notifications,
 * Modal managers, and responsive navbar enhancements across all platform pages.
 */
(function(window, document) {
    'use strict';

    window.QCV = window.QCV || {};

    // 1. Toast Notification System
    QCV.toast = function(message, type = 'info', duration = 3500) {
        let container = document.getElementById('qcv-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'qcv-toast-container';
            container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'qcv-toast qcv-toast-' + type;
        
        let bg = '#1d4ed8'; // info
        let icon = 'ℹ️';
        if (type === 'success') { bg = '#059669'; icon = '✓'; }
        else if (type === 'error') { bg = '#dc2626'; icon = '✕'; }
        else if (type === 'warning') { bg = '#d97706'; icon = '⚠'; }

        toast.style.cssText = `
            background: ${bg};
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 12px;
            font-family: 'Cairo', 'Inter', sans-serif;
            font-size: 0.88rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            pointer-events: auto;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            direction: ${document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'};
        `;
        toast.innerHTML = `<span style="font-size:1.1rem">${icon}</span><span>${message}</span>`;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => { toast.remove(); }, 300);
        }, duration);
    };

    // 2. Global Auth State Management
    QCV.auth = {
        getUser: function() {
            try {
                const raw = localStorage.getItem('qcv_user') || localStorage.getItem('qcv_cached_user');
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                return null;
            }
        },
        setUser: function(user) {
            try {
                if (!user) {
                    localStorage.removeItem('qcv_user');
                    localStorage.removeItem('qcv_cached_user');
                } else {
                    const data = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.name || (user.email ? user.email.split('@')[0] : 'المستخدم'),
                        photoURL: user.photoURL || '',
                        plan: user.plan || 'free'
                    };
                    localStorage.setItem('qcv_cached_user', JSON.stringify(data));
                }
                QCV.syncNavAuth();
            } catch (e) {}
        },
        getPlan: function() {
            const u = this.getUser();
            return (u && u.plan) ? u.plan : 'free';
        },
        isLoggedIn: function() {
            return !!this.getUser();
        },
        logout: function() {
            this.setUser(null);
            if (window.firebase && window.firebase.auth) {
                try { window.firebase.auth().signOut(); } catch (_) {}
            }
            window.location.href = '/login.html';
        }
    };

    // 3. Sync Navigation Auth Buttons
    QCV.syncNavAuth = function() {
        const user = QCV.auth.getUser();
        const isAr = (document.documentElement.lang || 'ar') === 'ar';

        // Target all navbar login links
        const loginLinks = document.querySelectorAll('a.login, a[href*="login.html"]:not(.btn-cta):not(.btn-nav)');
        const ctaLinks = document.querySelectorAll('a.btn-cta, a.btn-nav, a[href*="login.html"].btn');

        if (user) {
            loginLinks.forEach(el => {
                if (el.classList.contains('no-auth-sync')) return;
                el.href = '/dashboard.html';
                el.innerHTML = isAr 
                    ? `<i class="fas fa-th-large" style="margin-left:4px"></i> لوحة التحكم`
                    : `<i class="fas fa-th-large" style="margin-right:4px"></i> Dashboard`;
            });

            ctaLinks.forEach(el => {
                if (el.classList.contains('no-auth-sync')) return;
                el.href = '/editor.html';
                el.innerHTML = isAr 
                    ? `<i class="fas fa-file-alt" style="margin-left:4px"></i> المحرر`
                    : `<i class="fas fa-file-alt" style="margin-right:4px"></i> Editor`;
            });
        } else {
            loginLinks.forEach(el => {
                if (el.classList.contains('no-auth-sync')) return;
                el.href = '/login.html';
                el.innerHTML = isAr 
                    ? `<i class="fas fa-sign-in-alt" style="margin-left:4px"></i> دخول`
                    : `<i class="fas fa-sign-in-alt" style="margin-right:4px"></i> Login`;
            });

            ctaLinks.forEach(el => {
                if (el.classList.contains('no-auth-sync')) return;
                el.href = '/login.html';
                el.innerHTML = isAr 
                    ? `<i class="fas fa-rocket" style="margin-left:4px"></i> ابدأ مجاناً`
                    : `<i class="fas fa-rocket" style="margin-right:4px"></i> Start Free`;
            });
        }
    };

    // 4. Upgrade Modal System
    QCV.showUpgradeModal = function(featureName) {
        const isAr = (document.documentElement.lang || 'ar') === 'ar';
        const title = isAr ? 'ترقية الحساب مطلوبة' : 'Account Upgrade Required';
        const msg = isAr 
            ? `ميزة "${featureName || 'الذكاء الاصطناعي'}" متاحة حصرياً للمشتركين في باقة Pro أو Unlimited.`
            : `Feature "${featureName || 'AI Features'}" is exclusively available to Pro or Unlimited subscribers.`;

        let modal = document.getElementById('qcv-upgrade-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'qcv-upgrade-modal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:var(--card, #fff);color:var(--text, #111);padding:32px;border-radius:20px;max-width:440px;width:100%;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.3);position:relative;font-family:'Cairo',sans-serif;">
                <div style="width:64px;height:64px;border-radius:50%;background:rgba(0,3,201,0.08);color:#0003c9;font-size:1.8rem;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                    ⭐
                </div>
                <h3 style="font-size:1.3rem;font-weight:800;margin-bottom:8px">${title}</h3>
                <p style="color:var(--muted,#666);font-size:0.92rem;line-height:1.6;margin-bottom:24px">${msg}</p>
                <div style="display:flex;flex-direction:column;gap:10px">
                    <a href="/pay.html?plan=pro" style="background:#0003c9;color:#fff;padding:12px;border-radius:12px;font-weight:700;text-decoration:none;font-size:0.95rem;transition:0.2s">
                        ${isAr ? 'ترقية الآن لـ Pro بـ 49 ج.م فقط' : 'Upgrade to Pro for only 49 EGP'}
                    </a>
                    <a href="/pay.html?plan=quick48" style="background:rgba(0,3,201,0.06);color:#0003c9;padding:10px;border-radius:12px;font-weight:600;text-decoration:none;font-size:0.88rem;">
                        ${isAr ? 'أو تجربة 48 ساعة بـ 30 ج.م' : 'Or 48-Hour Pass for 30 EGP'}
                    </a>
                    <button onclick="document.getElementById('qcv-upgrade-modal').remove()" style="background:none;border:none;color:var(--muted,#888);cursor:pointer;font-size:0.85rem;margin-top:6px;">
                        ${isAr ? 'إغلاق' : 'Close'}
                    </button>
                </div>
            </div>
        `;
    };

    // 5. Initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            QCV.syncNavAuth();
        });
    } else {
        QCV.syncNavAuth();
    }

})(window, document);