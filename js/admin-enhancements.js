// ===== QCV Admin Enhancements v2 =====
// Fixed: conflicts with admin.html, added pagination, parallel bulk ops, edit modals

(function(){
    if(!window.DB) return;
    var DB = window.DB;

    // ===== SUBSCRIPTION EXPIRY CHECK =====
    window.checkExpiredSubscriptions = function() {
        var now = Date.now();
        var users = window.allUsers || {};
        var expired = [];
        Object.entries(users).forEach(function(e) {
            var u = e[1];
            if((u.plan === 'pro' || u.plan === 'unlimited') && u.planExpiry && u.planExpiry < now) {
                expired.push({ uid: e[0], name: u.name, email: u.email, plan: u.plan, expiry: u.planExpiry });
            }
        });
        return expired;
    };

    window.autoDowngradeExpired = async function() {
        var expired = checkExpiredSubscriptions();
        if(!expired.length) { showToast('لا توجد اشتراكات منتهية', 'info'); return; }
        if(!confirm('تنزيل ' + expired.length + ' اشتراك منتهي تلقائياً؟')) return;
        await Promise.all(expired.map(function(e) {
            return restPatch('/users/' + e.uid, { plan: 'free', planExpiry: null, downloads: 0 });
        }));
        logAudit('تنزيل جماعي منتهي', 'subscription', expired.length + ' اشتراك منتهي');
        showToast('تم تنزيل ' + expired.length + ' اشتراك منتهي', 'success');
        loadAllData();
    };

    function renderExpiredBadge() {
        var expired = checkExpiredSubscriptions();
        var nav = document.querySelector('.nav-item[onclick*="subscriptions"]');
        if(!nav) return;
        var existing = nav.querySelector('.badge-expired');
        if(existing) existing.remove();
        if(expired.length > 0) {
            var b = document.createElement('span');
            b.className = 'badge badge-expired';
            b.style.cssText = 'background:rgba(239,68,68,.15);color:#ef4444;font-size:.6rem;padding:2px 6px;border-radius:10px;margin-right:4px;font-weight:700';
            b.textContent = expired.length + ' منتهي';
            nav.appendChild(b);
        }
    }

    // ===== EDIT MODALS =====
    window.editJobEnhanced = function(id) {
        var j = window.allJobs[id]; if(!j) return;
        document.getElementById('modalTitle').textContent = 'تعديل وظيفة';
        document.getElementById('modalBody').innerHTML =
            '<div class="field" style="margin-bottom:12px"><label>المسمى الوظيفي</label><input type="text" id="editJobTitle" value="'+escHtml(j.title||'')+'"></div>' +
            '<div class="field" style="margin-bottom:12px"><label>الفئة</label><input type="text" id="editJobCategory" value="'+escHtml(j.category||'')+'"></div>' +
            '<div class="field" style="margin-bottom:12px"><label>الموقع</label><input type="text" id="editJobLocation" value="'+escHtml(j.location||'')+'"></div>' +
            '<div class="field" style="margin-bottom:12px"><label>الوصف</label><textarea id="editJobDesc" style="min-height:80px;width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;font-family:Cairo,sans-serif">'+escHtml(j.description||'')+'</textarea></div>' +
            '<div class="field" style="margin-bottom:12px"><label>رابط التقديم</label><input type="text" id="editJobApplyLink" value="'+escHtml(j.applyLink||'')+'" placeholder="https://..." style="direction:ltr;text-align:left"></div>' +
            '<div class="field"><label>الحالة</label><select id="editJobActive"><option value="true"'+(j.active!==false?' selected':'')+'>نشطة</option><option value="false"'+(j.active===false?' selected':'')+'>معطلة</option></select></div>';
        document.getElementById('modalConfirm').style.display='block';
        document.getElementById('modalConfirm').textContent='حفظ';
        document.getElementById('modalConfirm').onclick=async function(){
            var title = document.getElementById('editJobTitle').value.trim();
            if(!title) { showToast('أدخل المسمى الوظيفي', 'error'); return; }
            await restPatch('/jobs/'+id, {
                title: title,
                category: document.getElementById('editJobCategory').value,
                location: document.getElementById('editJobLocation').value,
                description: document.getElementById('editJobDesc').value,
                applyLink: document.getElementById('editJobApplyLink').value.trim(),
                active: document.getElementById('editJobActive').value==='true',
                updatedAt: Date.now()
            });
            logAudit('تعديل وظيفة', 'jobs', title);
            closeModal(); showToast('تم تحديث الوظيفة', 'success'); loadAllData();
        };
        document.getElementById('modal').classList.add('show');
    };

    window.editStaffEnhanced = function(id) {
        var s = window.allStaff[id]; if(!s) return;
        var permDefs = [
            {k:'view_users',l:'عرض المستخدمين'},{k:'manage_users',l:'إدارة المستخدمين'},
            {k:'manage_staff',l:'إدارة الموظفين'},{k:'manage_subscriptions',l:'إدارة الاشتراكات'},
            {k:'manage_jobs',l:'إدارة الوظائف'},{k:'manage_settings',l:'إدارة الإعدادات'},
            {k:'manage_affiliate',l:'إدارة التسويق'},{k:'send_messages',l:'إرسال الرسائل'},
            {k:'manage_blog',l:'إدارة المدونة'},{k:'manage_support',l:'إدارة الدعم'},
            {k:'manage_backup',l:'إدارة النسخ الاحتياطي'},{k:'manage_security',l:'إدارة الأمان'}
        ];
        var perms = s.permissions || [];
        var permHTML = permDefs.map(function(p){
            return '<label style="display:flex;align-items:center;gap:6px;padding:5px 0;font-size:.8rem;cursor:pointer"><input type="checkbox" value="'+p.k+'" '+(perms.indexOf(p.k)!==-1?'checked':'')+' style="accent-color:var(--accent)"> '+p.l+'</label>';
        }).join('');
        document.getElementById('modalTitle').textContent = 'تعديل موظف — ' + (s.name||'');
        document.getElementById('modalBody').innerHTML =
            '<div class="field" style="margin-bottom:12px"><label>الاسم</label><input type="text" id="editStaffName" value="'+escHtml(s.name||'')+'"></div>' +
            '<div class="field" style="margin-bottom:12px"><label>البريد</label><input type="email" id="editStaffEmail" value="'+escHtml(s.email||'')+'"></div>' +
            '<div class="field" style="margin-bottom:12px"><label>كلمة المرور الجديدة (اتركها فاضية لو كما هي)</label><input type="password" id="editStaffPass" placeholder="اتركها فاضية"></div>' +
            '<div class="field" style="margin-bottom:12px"><label>الدور</label><select id="editStaffRole">' +
            '<option value="support"'+(s.role==='support'?' selected':'')+'>دعم فني</option>' +
            '<option value="manager"'+(s.role==='manager'?' selected':'')+'>مدير قسم</option>' +
            '<option value="admin"'+(s.role==='admin'?' selected':'')+'>مدير</option>' +
            '<option value="super_admin"'+(s.role==='super_admin'?' selected':'')+'>مدير عام</option>' +
            '</select></div>' +
            '<div class="field" style="margin-bottom:12px"><label>الحالة</label><select id="editStaffActive">' +
            '<option value="true"'+(s.active!==false?' selected':'')+'>نشط</option>' +
            '<option value="false"'+(s.active===false?' selected':'')+'>غير نشط</option>' +
            '</select></div>' +
            '<div class="settings-card" style="margin-top:12px;border:1px solid var(--border);border-radius:12px;padding:14px">' +
            '<h4 style="font-size:.82rem;font-weight:800;margin-bottom:10px"><i class="fas fa-key"></i> الصلاحيات</h4>'+permHTML+'</div>';
        document.getElementById('modalConfirm').style.display='block';
        document.getElementById('modalConfirm').textContent='حفظ';
        document.getElementById('modalConfirm').onclick=async function(){
            var newPerms=[];
            document.querySelectorAll('#modalBody input[type=checkbox]:checked').forEach(function(cb){newPerms.push(cb.value);});
            var update={
                name:document.getElementById('editStaffName').value,
                email:document.getElementById('editStaffEmail').value,
                role:document.getElementById('editStaffRole').value,
                permissions:newPerms,
                active:document.getElementById('editStaffActive').value==='true'
            };
            var pass=document.getElementById('editStaffPass').value.trim();
            if(pass) update.password=pass;
            await restPatch('/staff/'+id, update);
            logAudit('تعديل موظف', 'staff', update.name);
            closeModal(); showToast('تم تحديث الموظف', 'success'); loadAllData();
        };
        document.getElementById('modal').classList.add('show');
    };

    window.editDomainEnhanced = function(id) {
        var d = window.allDomains[id]; if(!d) return;
        document.getElementById('modalTitle').textContent = 'تعديل نطاق';
        document.getElementById('modalBody').innerHTML =
            '<div class="field" style="margin-bottom:12px"><label>النطاق</label><input type="text" id="editDomainName" value="'+escHtml(d.domain||'')+'" style="direction:ltr;text-align:left"></div>' +
            '<div class="field" style="margin-bottom:12px"><label>الباقة المطلوبة</label><select id="editDomainPlan">' +
            '<option value="free"'+(d.plan==='free'?' selected':'')+'>مجانية</option>' +
            '<option value="pro"'+(d.plan==='pro'?' selected':'')+'>احترافية</option>' +
            '<option value="unlimited"'+(d.plan==='unlimited'?' selected':'')+'>غير محدودة</option>' +
            '</select></div>' +
            '<div class="field" style="margin-bottom:12px"><label>المدة (أيام)</label><input type="number" id="editDomainDuration" value="'+(d.duration||30)+'"></div>' +
            '<div class="field"><label>الحالة</label><select id="editDomainActive">' +
            '<option value="true"'+(d.active!==false?' selected':'')+'>نشطة</option>' +
            '<option value="false"'+(d.active===false?' selected':'')+'>معطلة</option>' +
            '</select></div>';
        document.getElementById('modalConfirm').style.display='block';
        document.getElementById('modalConfirm').textContent='حفظ';
        document.getElementById('modalConfirm').onclick=async function(){
            var newName = document.getElementById('editDomainName').value.trim().toLowerCase();
            var newPlan = document.getElementById('editDomainPlan').value;
            var newDuration = parseInt(document.getElementById('editDomainDuration').value)||30;
            var newActive = document.getElementById('editDomainActive').value==='true';
            await restPatch('/domains/'+id,{
                domain:newName,
                plan:newPlan,
                duration:newDuration,
                active:newActive
            });
            // Remove old approvedDomain entry if domain name changed
            if (d.domain && d.domain !== newName) {
                var oldDk = d.domain.toLowerCase().replace(/\./g, '_');
                await (window.syncApprovedDomain || function(){} )({ domain: d.domain, _delete: true });
            }
            // Sync to approvedDomains
            await (window.syncApprovedDomain || async function(dd){
                try {
                    var dk = (dd.domain||'').toLowerCase().replace(/\./g, '_');
                    if (!dk) return;
                    if (dd.active === false || dd._delete) {
                        await restDelete('/approvedDomains/' + dk);
                    } else {
                        await restPatch('/approvedDomains/' + dk, {
                            domain: dd.domain, plan: dd.plan || 'free', duration: dd.duration || 30, active: dd.active !== false
                        });
                    }
                } catch(e) {}
            })({ domain: newName, plan: newPlan, duration: newDuration, active: newActive });
            // Apply plan to existing users with this domain
            if (typeof applyDomainPlanToUsers === 'function') {
                await applyDomainPlanToUsers(newName, newPlan, newDuration);
            }
            logAudit('تعديل نطاق', 'domains', newName);
            closeModal(); showToast('تم تحديث النطاق', 'success'); loadAllData();
        };
        document.getElementById('modal').classList.add('show');
    };

    window.editCampaignEnhanced = function(id) {
        var c = window.allCampaigns[id]; if(!c) return;
        document.getElementById('modalTitle').textContent = 'تعديل حملة';
        document.getElementById('modalBody').innerHTML =
            '<div class="field" style="margin-bottom:12px"><label>اسم الحملة</label><input type="text" id="editCampName" value="'+escHtml(c.name||'')+'"></div>' +
            '<div class="field"><label>كود الحملة</label><input type="text" id="editCampCode" value="'+escHtml(c.code||'')+'" style="direction:ltr;text-align:left"></div>';
        document.getElementById('modalConfirm').style.display='block';
        document.getElementById('modalConfirm').textContent='حفظ';
        document.getElementById('modalConfirm').onclick=async function(){
            await restPatch('/affiliateCampaigns/'+id,{
                name:document.getElementById('editCampName').value,
                code:document.getElementById('editCampCode').value
            });
            logAudit('تعديل حملة', 'affiliate', document.getElementById('editCampName').value);
            closeModal(); showToast('تم تحديث الحملة', 'success'); loadAllData();
        };
        document.getElementById('modal').classList.add('show');
    };

    // ===== COMMISSION PAYOUT =====
    window.markCommissionPaid = async function(id) {
        await restPatch('/affiliateCommissions/'+id,{status:'paid',paidAt:Date.now()});
        logAudit('دفع عمولة', 'affiliate', id);
        showToast('تم تحديد العمولة كمدفوعة','success');
        loadAllData();
    };

    window.markCommissionUnpaid = async function(id) {
        await restPatch('/affiliateCommissions/'+id,{status:'pending',paidAt:null});
        logAudit('إلغاء دفع عمولة', 'affiliate', id);
        showToast('تم إلغاء دفع العمولة','warning');
        loadAllData();
    };

    // ===== EXPIRED SUBSCRIPTIONS PANEL =====
    window.showExpiredPanel = function() {
        var expired = checkExpiredSubscriptions();
        document.getElementById('modalTitle').textContent = 'اشتراكات منتهية ('+expired.length+')';
        if(!expired.length) {
            document.getElementById('modalBody').innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)"><i class="fas fa-check-circle" style="font-size:2rem;color:var(--green);margin-bottom:10px;display:block"></i>لا توجد اشتراكات منتهية</div>';
            document.getElementById('modalConfirm').style.display='none';
            document.getElementById('modal').classList.add('show');
            return;
        }
        var html = '<div style="max-height:400px;overflow-y:auto">';
        expired.forEach(function(e) {
            var c = getAvatarColor(e.uid);
            var days = Math.floor((Date.now() - e.expiry) / 86400000);
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;background:var(--bg)"><div style="display:flex;align-items:center;gap:10px"><div class="user-avatar" style="background:'+c+';width:32px;height:32px;font-size:.75rem">'+escHtml((e.name||'U')[0].toUpperCase())+'</div><div><div style="font-weight:700;font-size:.82rem">'+escHtml(e.name||e.email)+'</div><div style="font-size:.7rem;color:var(--muted)">منتهي منذ '+days+' يوم</div></div></div><span class="badge '+planBadgeClass(e.plan)+'">'+planText(e.plan)+'</span></div>';
        });
        html += '</div>';
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('modalConfirm').style.display='block';
        document.getElementById('modalConfirm').textContent='تنزيل الكل ('+expired.length+')';
        document.getElementById('modalConfirm').onclick=function(){autoDowngradeExpired();closeModal();};
        document.getElementById('modal').classList.add('show');
    };

    // ===== ADD EXPIRED BUTTON TO SUBSCRIPTIONS =====
    function addExpiredButton() {
        var head = document.querySelector('#panel-subscriptions .table-head');
        if(!head || document.getElementById('expiredBtn')) return;
        var btn = document.createElement('button');
        btn.id = 'expiredBtn';
        btn.className = 'btn-danger-sm';
        btn.style.cssText = 'font-size:.78rem';
        var expired = checkExpiredSubscriptions();
        btn.innerHTML = '<i class="fas fa-clock"></i> منتهية ('+expired.length+')';
        btn.onclick = showExpiredPanel;
        head.appendChild(btn);
    }

    // ===== PAGINATION FOR USERS =====
    var usersPageSize = 20;
    var usersCurrentPage = 1;
    var usersFilteredEntries = [];

    function getFilteredUsers() {
        var q = (document.getElementById('searchUsers') ? document.getElementById('searchUsers').value : '').toLowerCase();
        var planFilter = (document.getElementById('filterPlan') || {}).value || 'all';
        var statusFilter = (document.getElementById('filterStatus') || {}).value || 'all';
        var dateFilter = (document.getElementById('filterDate') || {}).value || 'all';
        var now = Date.now();
        return Object.entries(window.allUsers || {}).filter(function(e) {
            var uid = e[0], u = e[1];
            if(q && (u.name||'').toLowerCase().indexOf(q) === -1 && (u.email||'').toLowerCase().indexOf(q) === -1 && uid.toLowerCase().indexOf(q) === -1) return false;
            if(planFilter !== 'all' && (u.plan || 'free') !== planFilter) return false;
            if(statusFilter === 'active' && u.banned === true) return false;
            if(statusFilter === 'banned' && u.banned !== true) return false;
            if(dateFilter !== 'all' && u.registeredAt) {
                var days = parseInt(dateFilter);
                if ((now - u.registeredAt) > days * 86400000) return false;
            }
            return true;
        });
    }

    function renderUsersPagination() {
        var pag = document.getElementById('users-pagination');
        if(!pag) return;
        var total = usersFilteredEntries.length;
        var pages = Math.ceil(total / usersPageSize);
        if(pages <= 1) { pag.innerHTML = ''; return; }
        var pg = usersCurrentPage;
        var html = '<span class="page-info" style="font-size:.78rem;color:var(--muted);padding:0 8px">'+total+' مستخدم · صفحة '+pg+' من '+pages+'</span>';
        if(pg > 1) html += '<button onclick="window._usersGoPage('+(pg-1)+')">&laquo;</button>';
        var start = Math.max(1, pg - 3);
        var end = Math.min(pages, pg + 3);
        if(start > 1) html += '<button onclick="window._usersGoPage(1)">1</button>';
        if(start > 2) html += '<span style="padding:0 4px;color:var(--muted)">...</span>';
        for(var i = start; i <= end; i++) {
            html += '<button class="'+(i===pg?'active':'')+'" onclick="window._usersGoPage('+i+')">'+i+'</button>';
        }
        if(end < pages - 1) html += '<span style="padding:0 4px;color:var(--muted)">...</span>';
        if(end < pages) html += '<button onclick="window._usersGoPage('+pages+')">'+pages+'</button>';
        if(pg < pages) html += '<button onclick="window._usersGoPage('+(pg+1)+')">&raquo;</button>';
        pag.innerHTML = html;
    }

    window._usersGoPage = function(page) {
        usersCurrentPage = page;
        renderUsersPage();
        renderUsersPagination();
    };

    function renderUsersPage() {
        var ut = document.getElementById('allUsers');
        if(!ut) return;
        usersFilteredEntries = getFilteredUsers();
        var start = (usersCurrentPage - 1) * usersPageSize;
        var pageEntries = usersFilteredEntries.slice(start, start + usersPageSize);
        ut.innerHTML = pageEntries.length ? pageEntries.map(function(e) {
            var uid = e[0], u = e[1], pl = u.plan || 'free', b = u.banned === true, c = getAvatarColor(uid);
            var prov = u.authProvider === 'google.com' ? '<i class="fab fa-google" style="color:#4285f4;font-size:.7rem;margin-right:4px"></i>' : '';
            var authBadge = u.authOnly ? '<span style="font-size:.6rem;background:rgba(245,158,11,.1);color:#f59e0b;padding:2px 6px;border-radius:4px;margin-right:4px;font-weight:600">جديد</span>' : '';
            var checked = window.selectedUsers[uid] ? ' checked' : '';
            var expired = (pl !== 'free' && u.planExpiry && u.planExpiry < Date.now());
            var expiryBadge = expired ? ' <span style="font-size:.6rem;background:rgba(239,68,68,.1);color:#ef4444;padding:2px 5px;border-radius:4px">منتهي</span>' : '';
            return '<tr style="'+(window.selectedUsers[uid]?'background:rgba(0,3,201,.04)':'')+'"><td style="text-align:center"><input type="checkbox" class="user-row-cb" data-uid="'+escHtml(uid)+'"'+checked+' onchange="toggleUserSelect(\''+escHtml(uid)+'\',this.checked)" style="accent-color:var(--accent);cursor:pointer"></td><td><div class="user-cell"><div class="user-avatar" style="background:'+c+'">'+escHtml((u.name||'U')[0].toUpperCase())+'</div><div class="user-info"><div class="name">'+authBadge+escHtml(u.name||'مستخدم')+'</div><div class="email">'+prov+escHtml(u.email||'-')+'</div><div style="font-size:.65rem;color:var(--muted);direction:ltr;display:inline-block">'+escHtml(uid.substring(0,10))+'</div></div></div></td><td><span class="badge '+planBadgeClass(pl)+'">'+planText(pl)+'</span>'+expiryBadge+'</td><td>'+formatDate(u.registeredAt)+'</td><td>'+formatDateTime(u.lastLogin)+'</td><td>'+(b?'<span class="badge badge-banned">محظور</span>':'<span class="badge badge-active">نشط</span>')+'</td><td><div class="actions"><button class="btn-action btn-view" onclick="viewUser(\''+escHtml(uid)+'\')"><i class="fas fa-eye"></i></button><button class="btn-action btn-change-plan" onclick="changePlan(\''+escHtml(uid)+'\')"><i class="fas fa-exchange-alt"></i></button>'+(b?'<button class="btn-action btn-unban" onclick="toggleBan(\''+escHtml(uid)+'\',false)"><i class="fas fa-unlock"></i></button>':'<button class="btn-action btn-ban" onclick="toggleBan(\''+escHtml(uid)+'\',true)"><i class="fas fa-ban"></i></button>')+'<button class="btn-action btn-delete" onclick="deleteUser(\''+escHtml(uid)+'\')"><i class="fas fa-trash"></i></button></div></td></tr>';
        }).join('') : '<tr><td colspan="7" class="empty-state"><p>لا يوجد مستخدمين</p></td></tr>';
        // Update stats
        window.updateUserStats(usersFilteredEntries);
    }

    // ===== OVERRIDE filterUsers TO USE PAGINATION =====
    var _origFilterUsers = window.filterUsers;
    window.filterUsers = function() {
        usersCurrentPage = 1;
        renderUsersPage();
        renderUsersPagination();
        window.updateBulkBar();
    };

    // ===== OVERRIDE checkAndLoad TO ADD ENHANCEMENTS (no double rendering) =====
    var _origCheck = window.checkAndLoad;
    window.checkAndLoad = function() {
        return _origCheck.apply(this, arguments).then(function(result){
            // Reset pagination when data reloads
            usersCurrentPage = 1;
            usersFilteredEntries = getFilteredUsers();
            renderUsersPage();
            renderUsersPagination();
            renderExpiredBadge();
            addExpiredButton();
            return result;
        });
    };

    // ===== OVERRIDE loadAllData alias =====
    window.loadAllData = window.checkAndLoad;

    console.log('[QCV Admin] Enhancements v2 loaded — no conflicts');
})();
