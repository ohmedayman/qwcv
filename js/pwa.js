// QCV PWA Install Prompt
(function(){
    if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(function(){});
    }

    var deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        if(localStorage.getItem('qcv_install_dismissed')) return;
        var banner = document.getElementById('installBanner');
        if(banner) banner.style.display = 'flex';
    });

    document.addEventListener('DOMContentLoaded', function() {
        var installBtn = document.getElementById('installBtn');
        var installClose = document.getElementById('installClose');
        var installBanner = document.getElementById('installBanner');

        if(installBtn) {
            installBtn.addEventListener('click', function() {
                if(!deferredPrompt) return;
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function() {
                    deferredPrompt = null;
                    if(installBanner) installBanner.style.display = 'none';
                });
            });
        }
        if(installClose) {
            installClose.addEventListener('click', function() {
                if(installBanner) installBanner.style.display = 'none';
                localStorage.setItem('qcv_install_dismissed', '1');
            });
        }
    });

    window.addEventListener('appinstalled', function() {
        deferredPrompt = null;
        var banner = document.getElementById('installBanner');
        if(banner) banner.style.display = 'none';
    });
})();
