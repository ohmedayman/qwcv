/*
 * QCV Auto-Reload
 * Checks Firebase for site version and forces reload if updated
 */
(function(){
    var DB = 'https://qwcv-1cfad-default-rtdb.firebaseio.com';
    var CHECK_INTERVAL = 30000;
    var currentVersion = localStorage.getItem('qcv_site_version') || '0';

    function checkVersion(){
        fetch(DB + '/siteSettings/version.json?_=' + Date.now())
            .then(function(r){
                if(!r.ok) throw new Error('not ok');
                return r.json();
            })
            .then(function(v){
                if(v && typeof v === 'string' && v !== currentVersion){
                    console.log('[QCV] Version changed:', currentVersion, '->', v, '. Reloading...');
                    localStorage.setItem('qcv_site_version', v);
                    location.reload(true);
                }
            })
            .catch(function(e){
                console.log('[QCV] Version check failed:', e.message);
            });
    }

    // Check immediately (small delay to avoid initial load race)
    setTimeout(checkVersion, 2000);

    // Check periodically
    setInterval(checkVersion, CHECK_INTERVAL);

    // Also check when page becomes visible again (user switched tabs)
    document.addEventListener('visibilitychange', function(){
        if(!document.hidden) checkVersion();
    });

    // Also listen for storage changes from other tabs
    window.addEventListener('storage', function(e) {
        if(e.key === 'qcv_site_version' && e.newValue && e.newValue !== currentVersion) {
            currentVersion = e.newValue;
            location.reload(true);
        }
    });
})();
