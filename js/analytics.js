// QCV Analytics - Visit tracking, active users, time on site
(function(){
    var CFG = {
        apiKey: "AIzaSyA2pXUB830VPoro1BChDY0Ii5Gt_BTrK8I",
        authDomain: "qwcv-1cfad.firebaseapp.com",
        databaseURL: "https://qwcv-1cfad-default-rtdb.firebaseio.com",
        projectId: "qwcv-1cfad",
        storageBucket: "qwcv-1cfad.firebasestorage.app",
        messagingSenderId: "792471802122",
        appId: "1:792471802122:web:808e04099afc90315aaaf3"
    };

    var DB = CFG.databaseURL;

    function genId(){
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2,8);
    }

    // Read then write (atomic increment via REST)
    function incrementValue(path, amount){
        amount = amount || 1;
        fetch(DB + '/' + path + '.json')
            .then(function(r){ return r.json(); })
            .then(function(current){
                var val = (typeof current === 'number') ? current : 0;
                return fetch(DB + '/' + path + '.json', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(val + amount)
                });
            })
            .catch(function(){});
    }

    // Patch increment for date-keyed values
    function incrementDateValue(path, amount){
        amount = amount || 1;
        var today = new Date().toISOString().slice(0,10);
        var fullPath = DB + '/' + path + '/' + today + '.json';
        fetch(fullPath)
            .then(function(r){ return r.json(); })
            .then(function(current){
                var val = (typeof current === 'number') ? current : 0;
                return fetch(fullPath, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(val + amount)
                });
            })
            .catch(function(){});
    }

    function trackVisit(){
        try{
            incrementDateValue('analytics/visits', 1);
            incrementValue('analytics/totalVisits', 1);
        }catch(e){}
    }

    function trackActiveSession(){
        var sid = sessionStorage.getItem('qcv_session') || genId();
        sessionStorage.setItem('qcv_session', sid);

        var ref = DB + '/analytics/activeSessions/' + sid;
        var data = {
            page: location.pathname,
            start: Date.now(),
            lastSeen: Date.now()
        };

        fetch(ref + '.json', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(function(){});

        var heartbeat = setInterval(function(){
            fetch(ref + '/lastSeen.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Date.now())
            }).catch(function(){});
        }, 30000);

        window.addEventListener('beforeunload', function(){
            clearInterval(heartbeat);
            fetch(ref + '.json', { method: 'DELETE' }).catch(function(){});
        });
    }

    function trackTimeOnPage(){
        var start = Date.now();
        window.addEventListener('beforeunload', function(){
            var seconds = Math.floor((Date.now() - start) / 1000);
            if(seconds > 2){
                incrementDateValue('analytics/timeOnSite', seconds);
            }
        });
    }

    function trackPageView(){
        var page = location.pathname.split('/').pop() || 'index.html';
        var safePage = page.replace(/\./g,'_');
        incrementDateValue('analytics/pageViews/' + safePage, 1);
    }

    function cleanupSessions(){
        var cutoff = Date.now() - 60000;
        fetch(DB + '/analytics/activeSessions.json')
            .then(function(r){ return r.json(); })
            .then(function(data){
                if(!data) return;
                var updates = {};
                Object.keys(data).forEach(function(k) {
                    if(data[k].lastSeen < cutoff) updates[k] = null;
                });
                if(Object.keys(updates).length > 0){
                    fetch(DB + '/analytics/activeSessions.json', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    }).catch(function(){});
                }
            }).catch(function(){});
    }

    function checkEnabled(callback){
        fetch(DB + '/settings/trackerEnabled.json')
            .then(function(r){ return r.json(); })
            .then(function(val){
                if(val === false){ return; }
                callback();
            })
            .catch(function(){ callback(); });
    }

    checkEnabled(function(){
        trackVisit();
        trackActiveSession();
        trackTimeOnPage();
        trackPageView();
    });
    cleanupSessions();
    setInterval(cleanupSessions, 60000);

    window.QCVAnalytics = {
        getActiveCount: function(){
            return fetch(DB + '/analytics/activeSessions.json')
                .then(function(r){ return r.json(); })
                .then(function(data){ return data ? Object.keys(data).length : 0; })
                .catch(function(){ return 0; });
        },
        getTotalUsers: function(){
            return fetch(DB + '/users.json?shallow=true')
                .then(function(r){ return r.json(); })
                .then(function(data){ return data ? Object.keys(data).length : 0; })
                .catch(function(){ return 0; });
        },
        getVisits: function(date){
            var d = date || new Date().toISOString().slice(0,10);
            return fetch(DB + '/analytics/visits/' + d + '.json')
                .then(function(r){ return r.json(); })
                .then(function(v){ return v || 0; })
                .catch(function(){ return 0; });
        },
        getTotalVisits: function(){
            return fetch(DB + '/analytics/totalVisits.json')
                .then(function(r){ return r.json(); })
                .then(function(v){ return v || 0; })
                .catch(function(){ return 0; });
        },
        getPageViews: function(){
            return fetch(DB + '/analytics/pageViews.json')
                .then(function(r){ return r.json(); })
                .then(function(data){
                    if(!data) return {};
                    var totals = {};
                    Object.keys(data).forEach(function(page) {
                        totals[page] = Object.values(data[page]).reduce(function(a,b){ return a + b; }, 0);
                    });
                    return totals;
                }).catch(function(){ return {}; });
        },
        getTimeOnSite: function(date){
            var d = date || new Date().toISOString().slice(0,10);
            return fetch(DB + '/analytics/timeOnSite/' + d + '.json')
                .then(function(r){ return r.json(); })
                .then(function(v){ return v || 0; })
                .catch(function(){ return 0; });
        }
    };
})();
