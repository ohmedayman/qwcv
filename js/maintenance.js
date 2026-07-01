// QCV Maintenance Check
(function(){
    var DB = 'https://qwcv-1cfad-default-rtdb.firebaseio.com';
    var EXEMPT = ['admin.html','admin-setup.html','login.html','editor.html','portfolio-view.html'];

    var page = location.pathname.split('/').pop() || 'index.html';
    if(EXEMPT.indexOf(page) !== -1) return;

    function isMaintenanceOn(m){
        if(m === true) return true;
        if(m && typeof m === 'object' && m.enabled === true) return true;
        if(m && m.enabled === 'true') return true;
        return false;
    }

    // Global watcher — survives DOM replacement
    window._maintInterval = setInterval(function(){
        fetch(DB + '/siteSettings/maintenance.json?_=' + Date.now())
            .then(function(r){ return r.json(); })
            .then(function(m){
                if(!isMaintenanceOn(m)){
                    location.reload(true);
                }
            })
            .catch(function(){});
    }, 120000);

    fetch(DB + '/siteSettings/maintenance.json')
        .then(function(r){ return r.json(); })
        .then(function(m){
            if(!isMaintenanceOn(m)) return;
            renderMaintenance(m);
        })
        .catch(function(){});

    function renderMaintenance(m){
        var msg = (m && m.message) || 'الموقع تحت الصيانة حالياً. سنعود قريباً.';
        var accent = (m && m.accentColor) || '#0003c9';

        document.open();
        document.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>صيانة - QCV</title><link rel="icon" type="image/png" href="https://i.postimg.cc/L59BQSvq/qcv-app-icon-final.png"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0e1a;color:#f1f5f9;font-family:"Inter","Cairo",sans-serif;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;overflow:hidden}.wrap{max-width:520px}.logo{font-size:2.2rem;font-weight:900;margin-bottom:20px;letter-spacing:-1px}.logo span{color:'+accent+'}.icon-wrap{width:110px;height:110px;border-radius:50%;background:linear-gradient(135deg,'+accent+'18,'+accent+'08);display:flex;align-items:center;justify-content:center;margin:0 auto 24px;border:2px solid '+accent+'30;animation:pulse 3s ease-in-out infinite}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}h1{font-size:1.6rem;font-weight:800;margin-bottom:10px}p{font-size:0.95rem;opacity:0.6;line-height:1.6;margin-bottom:24px}.timer{display:flex;gap:10px;justify-content:center}.timer div{background:'+accent+'15;border:1px solid '+accent+'30;border-radius:10px;padding:10px 16px;min-width:65px}.timer strong{display:block;font-size:1.5rem;font-weight:800;color:'+accent+'}.timer small{font-size:0.65rem;opacity:0.5}</style></head><body><div class="wrap"><div class="icon-wrap"><span style="font-size:3rem">🔧</span></div><div class="logo">Q<span>CV</span></div><h1>الموقع تحت الصيانة</h1><p>'+msg+'</p><div class="timer"><div><strong id="mh">00</strong><small>ساعة</small></div><div><strong id="mm">00</strong><small>دقيقة</small></div><div><strong id="ms">00</strong><small>ثانية</small></div></div></div><script>var _s=0;setInterval(function(){_s++;var h=Math.floor(_s/3600),m=Math.floor((_s%3600)/60),s=_s%60;document.getElementById("mh").textContent=String(h).padStart(2,"0");document.getElementById("mm").textContent=String(m).padStart(2,"0");document.getElementById("ms").textContent=String(s).padStart(2,"0")},1000)</'+'script></body></html>');
        document.close();
    }
})();
