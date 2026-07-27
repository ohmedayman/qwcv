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

    // ===== VIEW JOB =====
    window.viewJob = function(id) {
        var j = (window.allJobs || {})[id]; if(!j) return;
        document.getElementById('modalTitle').textContent = j.title || 'وظيفة';
        var applyBtn = j.applyLink ? '<a href="'+escHtml(j.applyLink)+'" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:linear-gradient(135deg,#059669,#047857);color:#fff;border-radius:10px;font-weight:700;font-size:.85rem;text-decoration:none;margin-top:12px;transition:all .15s" onmouseover="this.style.opacity=\'.85\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.opacity=\'1\';this.style.transform=\'none\'"><i class="fas fa-external-link-alt"></i> قدّم الآن</a>' : '<div style="margin-top:12px;padding:10px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:10px;font-size:.82rem;color:#f59e0b;font-weight:600"><i class="fas fa-exclamation-triangle" style="margin-left:4px"></i> لا يوجد رابط تقديم بعد — أضفه من تعديل الوظيفة</div>';
        document.getElementById('modalBody').innerHTML =
            '<div style="display:grid;gap:12px">' +
            '<div class="profile-row"><div class="label">المسمى</div><div class="value" style="font-weight:800;font-size:1rem">' + escHtml(j.title || '-') + '</div></div>' +
            '<div class="profile-row"><div class="label">الفئة</div><div class="value">' + escHtml(j.category || 'غير محدد') + '</div></div>' +
            '<div class="profile-row"><div class="label">الموقع</div><div class="value">' + escHtml(j.location || 'غير محدد') + '</div></div>' +
            '<div class="profile-row"><div class="label">الحالة</div><div class="value">' + (j.active !== false ? '<span class="badge badge-active">نشطة</span>' : '<span class="badge badge-inactive">معطلة</span>') + '</div></div>' +
            '<div class="profile-row"><div class="label">التاريخ</div><div class="value">' + formatDate(j.createdAt) + '</div></div>' +
            (j.description ? '<div style="background:var(--bg);border-radius:10px;padding:14px;border:1px solid var(--border)"><div style="font-weight:700;font-size:.82rem;margin-bottom:8px"><i class="fas fa-align-left" style="color:var(--accent);margin-left:4px"></i>الوصف</div><div style="font-size:.82rem;line-height:1.8;color:var(--text);white-space:pre-wrap">' + escHtml(j.description) + '</div></div>' : '') +
            applyBtn +
            '</div>';
        document.getElementById('modalConfirm').style.display = 'none';
        document.getElementById('modal').classList.add('show');
    };

    // ===== STAFF: FULL CRUD =====
    window.showAddStaffEnhanced = function() {
        document.getElementById('modalTitle').textContent = 'إضافة موظف جديد';
        document.getElementById('modalBody').innerHTML =
            '<div class="field" style="margin-bottom:12px"><label>الاسم الكامل <span style="color:var(--red)">*</span></label><input type="text" id="staffName" placeholder="الاسم الكامل للموظف"></div>' +
            '<div class="field" style="margin-bottom:12px"><label>البريد الإلكتروني <span style="color:var(--red)">*</span></label><input type="email" id="staffEmail" placeholder="email@example.com"></div>' +
            '<div class="field" style="margin-bottom:12px"><label>كلمة المرور <span style="color:var(--red)">*</span></label><input type="password" id="staffPass" placeholder="كلمة المرور"></div>' +
            '<div class="field" style="margin-bottom:12px"><label>الدور</label><select id="staffRole">' +
            '<option value="support">دعم فني</option>' +
            '<option value="manager">مدير قسم</option>' +
            '<option value="admin">مدير</option>' +
            '<option value="super_admin">مدير عام</option>' +
            '</select></div>' +
            '<div class="settings-card" style="margin-top:12px;border:1px solid var(--border);border-radius:12px;padding:14px">' +
            '<h4 style="font-size:.82rem;font-weight:800;margin-bottom:10px"><i class="fas fa-key"></i> الصلاحيات</h4>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
            [
                {k:'view_users',l:'عرض المستخدمين'},{k:'manage_users',l:'إدارة المستخدمين'},
                {k:'manage_staff',l:'إدارة الموظفين'},{k:'manage_subscriptions',l:'إدارة الاشتراكات'},
                {k:'manage_jobs',l:'إدارة الوظائف'},{k:'manage_settings',l:'إدارة الإعدادات'},
                {k:'manage_affiliate',l:'إدارة التسويق'},{k:'send_messages',l:'إرسال الرسائل'},
                {k:'manage_blog',l:'إدارة المدونة'},{k:'manage_support',l:'إدارة الدعم'},
                {k:'manage_backup',l:'إدارة النسخ الاحتياطي'},{k:'manage_security',l:'إدارة الأمان'}
            ].map(function(p){
                return '<label style="display:flex;align-items:center;gap:6px;padding:5px 0;font-size:.8rem;cursor:pointer"><input type="checkbox" value="'+p.k+'" class="staff-perm-check" style="accent-color:var(--accent)"> '+p.l+'</label>';
            }).join('') +
            '</div></div>';
        document.getElementById('modalConfirm').style.display = 'block';
        document.getElementById('modalConfirm').textContent = 'إضافة موظف';
        document.getElementById('modalConfirm').onclick = async function() {
            var name = document.getElementById('staffName').value.trim();
            var email = document.getElementById('staffEmail').value.trim();
            var pass = document.getElementById('staffPass').value.trim();
            if (!name) { showToast('أدخل اسم الموظف', 'error'); return; }
            if (!email) { showToast('أدخل البريد الإلكتروني', 'error'); return; }
            if (!pass) { showToast('أدخل كلمة المرور', 'error'); return; }
            var perms = [];
            document.querySelectorAll('.staff-perm-check:checked').forEach(function(cb) { perms.push(cb.value); });
            await restPost('/staff', { name: name, email: email, password: pass, role: document.getElementById('staffRole').value, permissions: perms, active: true, createdAt: Date.now() });
            logAudit('إضافة موظف', 'staff', name + ' — ' + document.getElementById('staffRole').value);
            showToast('تمت إضافة الموظف بنجاح', 'success');
            closeModal();
            loadAllData();
        };
        document.getElementById('modal').classList.add('show');
    };

    // ===== DOMAINS: REAL DATA RENDERING =====
    window.renderDomainsEnhanced = function() {
        var dt = document.getElementById('domainsList');
        if (!dt) return;
        var doms = Object.entries(window.allDomains);
        if (!doms.length) {
            dt.innerHTML = '<tr><td colspan="6" class="empty-state"><div style="text-align:center;padding:30px"><i class="fas fa-globe" style="font-size:2rem;color:var(--muted);margin-bottom:10px;display:block"></i><p>لا توجد نطاقات معتمدة</p><p style="font-size:.78rem;color:var(--muted);margin-top:6px">أضف نطاقات لتخصيص باقات المستخدمين تلقائياً</p></div></td></tr>';
            return;
        }
        var domainUserCount = {};
        Object.values(window.allUsers || {}).forEach(function(u) {
            if (u.email) {
                var dom = u.email.split('@')[1];
                if (dom) domainUserCount[dom] = (domainUserCount[dom] || 0) + 1;
            }
        });
        dt.innerHTML = doms.map(function(e) {
            var d = e[1];
            var userCnt = domainUserCount[d.domain] || d.userCount || 0;
            var statusBadge = d.active !== false ? '<span class="badge badge-active">نشطة</span>' : '<span class="badge badge-inactive">معطلة</span>';
            var syncStatus = '';
            restGet('/approvedDomains/' + (d.domain || '').replace(/\./g, '_') + '.json').then(function(approved) {
                if (!approved && d.active !== false) syncStatus = ' <span style="font-size:.6rem;background:rgba(245,158,11,.1);color:#f59e0b;padding:2px 5px;border-radius:4px">غير متزامن</span>';
            });
            return '<tr><td><strong style="direction:ltr;display:inline-block">' + escHtml(d.domain) + '</strong></td><td><span class="badge ' + planBadgeClass(d.plan) + '">' + planText(d.plan) + '</span></td><td>' + (d.duration || 30) + ' يوم</td><td>' + userCnt + ' مستخدم</td><td>' + statusBadge + '</td><td><div class="actions"><button class="btn-action btn-edit" onclick="(window.editDomainEnhanced||editDomain)(\'' + e[0] + '\')"><i class="fas fa-edit"></i></button><button class="btn-action btn-approve" onclick="syncSingleDomain(\'' + e[0] + '\')" title="مزامنة"><i class="fas fa-sync"></i></button><button class="btn-action btn-delete" onclick="deleteDomain(\'' + e[0] + '\')"><i class="fas fa-trash"></i></button></div></td></tr>';
        }).join('');
    };

    window.syncSingleDomain = async function(id) {
        var d = window.allDomains[id];
        if (!d || !d.domain) return;
        try {
            await (window.syncApprovedDomain || async function(){})();
            await syncApprovedDomain(d);
            showToast('تمت مزامنة النطاق: ' + d.domain, 'success');
        } catch(e) { showToast('خطأ في المزامنة', 'error'); }
    };

    // ===== NOTIFICATION TEMPLATES: ENHANCED =====
    window.renderTemplatesEnhanced = function() {
        restGet('/notificationTemplates.json').then(function(data) {
            window.allTemplates = data || {};
            var el = document.getElementById('tplList');
            if (!el) return;
            var entries = Object.entries(data || {});
            if (!entries.length) {
                el.innerHTML = '<div style="text-align:center;padding:40px"><div style="width:60px;height:60px;border-radius:50%;background:rgba(0,3,201,.08);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 12px"><i class="fas fa-file-alt"></i></div><p style="font-weight:700;margin-bottom:6px">لا توجد قوالب بعد</p><p style="font-size:.82rem;color:var(--muted)">أنشئ قالبات لإرسال إشعارات جماعية مسبقة التخطيط</p></div>';
                return;
            }
            var tplTypes = { welcome: 'ترحيب', promo: 'عرض خاص', expiry: 'تنبيه انتهاء', birthday: 'عيد ميلاد', custom: 'مخصص' };
            var tplIcons = { welcome: 'fa-hand-wave', promo: 'fa-tag', expiry: 'fa-clock', birthday: 'fa-birthday-cake', custom: 'fa-file-alt' };
            var tplColors = { welcome: 'var(--green)', promo: 'var(--purple)', expiry: 'var(--yellow)', birthday: 'var(--accent)', custom: 'var(--muted)' };
            el.innerHTML = entries.map(function(e) {
                var t = e[1];
                var tc = tplColors[t.type] || 'var(--accent)';
                var ti = tplIcons[t.type] || 'fa-file-alt';
                return '<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;transition:all .15s" onmouseover="this.style.borderColor=\''+tc+'\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
                    '<div style="width:44px;height:44px;border-radius:11px;background:'+tc+'15;color:'+tc+';display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.1rem"><i class="fas '+ti+'"></i></div>' +
                    '<div style="flex:1;min-width:0"><h4 style="font-size:.88rem;font-weight:800;margin-bottom:2px">' + escHtml(t.name || 'قالب') + '</h4><p style="font-size:.75rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(tplTypes[t.type] || t.type || 'مخصص') + ' — ' + escHtml((t.body || '').substring(0, 80)) + '</p></div>' +
                    '<div style="display:flex;gap:6px;flex-shrink:0"><button class="btn-action btn-view" onclick="previewTemplate(\'' + e[0] + '\')" title="معاينة"><i class="fas fa-eye"></i></button><button class="btn-action btn-edit" onclick="editTemplate(\'' + e[0] + '\')"><i class="fas fa-edit"></i></button><button class="btn-action btn-delete" onclick="deleteTemplate(\'' + e[0] + '\')"><i class="fas fa-trash"></i></button></div>' +
                    '</div>';
            }).join('');
            var sel = document.getElementById('schedTemplate');
            if (sel) { sel.innerHTML = '<option value="">اختر قالب</option>' + entries.map(function(e) { return '<option value="' + e[0] + '">' + escHtml(e[1].name || e[0]) + '</option>'; }).join(''); }
        });
    };

    window.previewTemplate = function(id) {
        var t = (window.allTemplates || {})[id];
        if (!t) return;
        document.getElementById('modalTitle').textContent = 'معاينة القالب — ' + (t.name || '');
        var tplTypes = { welcome: 'ترحيب', promo: 'عرض خاص', expiry: 'تنبيه انتهاء', birthday: 'عيد ميلاد', custom: 'مخصص' };
        document.getElementById('modalBody').innerHTML =
            '<div style="display:grid;gap:12px">' +
            '<div class="profile-row"><div class="label">النوع</div><div class="value"><span class="badge badge-pro">' + (tplTypes[t.type] || t.type || 'مخصص') + '</span></div></div>' +
            '<div class="profile-row"><div class="label">الموضوع</div><div class="value" style="font-weight:700">' + escHtml(t.subject || '-') + '</div></div>' +
            '<div style="background:var(--bg);border-radius:12px;padding:16px;border:1px solid var(--border);border-left:3px solid var(--accent)">' +
            '<div style="font-size:.78rem;color:var(--muted);margin-bottom:8px;font-weight:600"><i class="fas fa-envelope" style="margin-left:4px"></i>معاينة الرسالة</div>' +
            '<div style="font-size:.88rem;line-height:1.8;white-space:pre-wrap;color:var(--text)">' + escHtml(t.body || 'لا يوجد محتوى') + '</div>' +
            '</div>' +
            '<div style="font-size:.75rem;color:var(--muted)"><i class="fas fa-info-circle" style="margin-left:3px"></i>استخدم <code>{name}</code> لاسم المستخدم في النص</div>' +
            '</div>';
        document.getElementById('modalConfirm').style.display = 'none';
        document.getElementById('modal').classList.add('show');
    };

    // ===== SEGMENTS: ACTIVATE =====
    window.renderSegmentsEnhanced = function() {
        var entries = Object.entries(window.allUsers);
        var segs = [
            { label: 'الكل', icon: 'fa-users', color: 'var(--accent)', count: entries.length, filter: function() { return true; } },
            { label: 'نشط', icon: 'fa-user-check', color: 'var(--green)', count: entries.filter(function(e) { return !e[1].banned; }).length, filter: function(e) { return !e[1].banned; } },
            { label: 'محظور', icon: 'fa-user-slash', color: 'var(--red)', count: entries.filter(function(e) { return e[1].banned; }).length, filter: function(e) { return e[1].banned; } },
            { label: 'مجاني', icon: 'fa-user', color: '#6b7280', count: entries.filter(function(e) { return (e[1].plan||'free') === 'free'; }).length, filter: function(e) { return (e[1].plan||'free') === 'free'; } },
            { label: 'محترف', icon: 'fa-crown', color: 'var(--accent)', count: entries.filter(function(e) { return e[1].plan === 'pro'; }).length, filter: function(e) { return e[1].plan === 'pro'; } },
            { label: 'غير محدود', icon: 'fa-infinity', color: 'var(--purple)', count: entries.filter(function(e) { return e[1].plan === 'unlimited'; }).length, filter: function(e) { return e[1].plan === 'unlimited'; } },
            { label: 'جديد (7 أيام)', icon: 'fa-sparkles', color: 'var(--yellow)', count: entries.filter(function(e) { return e[1].registeredAt && (Date.now() - e[1].registeredAt) < 7*86400000; }).length, filter: function(e) { return e[1].registeredAt && (Date.now() - e[1].registeredAt) < 7*86400000; } },
            { label: 'مسوق', icon: 'fa-bullhorn', color: 'var(--green)', count: entries.filter(function(e) { return e[1].affiliateStatus === 'approved'; }).length, filter: function(e) { return e[1].affiliateStatus === 'approved'; } },
            { label: 'اشتراكي منتهي', icon: 'fa-clock', color: 'var(--red)', count: entries.filter(function(e) { return e[1].plan !== 'free' && e[1].planExpiry && e[1].planExpiry < Date.now(); }).length, filter: function(e) { return e[1].plan !== 'free' && e[1].planExpiry && e[1].planExpiry < Date.now(); } }
        ];
        var cards = document.getElementById('segmentCards');
        if (cards) cards.innerHTML = segs.map(function(s, i) {
            return '<div class="segment-card" onclick="showSegmentUsers(' + i + ')" style="cursor:pointer;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center;transition:all .2s" onmouseover="this.style.borderColor=\''+s.color+'\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.transform=\'none\'">' +
                '<div style="width:44px;height:44px;border-radius:12px;background:'+s.color+'15;color:'+s.color+';display:flex;align-items:center;justify-content:center;font-size:1.1rem;margin:0 auto 10px"><i class="fas '+s.icon+'"></i></div>' +
                '<div style="font-size:1.5rem;font-weight:900;color:'+s.color+'">' + s.count + '</div>' +
                '<div style="font-size:.82rem;font-weight:600;color:var(--muted);margin-top:2px">' + s.label + '</div>' +
                '</div>';
        }).join('');
        window._segFilters = segs;
    };

    // ===== REVENUE: USE APPROVED SUBSCRIPTIONS =====
    var _origRenderRevenue = window.renderRevenueDashboard;
    window.renderRevenueDashboard = function() {
        if (_origRenderRevenue) _origRenderRevenue();
        // Recalculate MRR from approved subscriptions
        var pp = parseInt(window.allSettings.proPrice) || 99;
        var up = parseInt(window.allSettings.unlimitedPrice) || 299;
        var approvedSubs = Object.values(window.allSubs || {}).filter(function(s) { return s.status === 'approved'; });
        var mrr = 0;
        approvedSubs.forEach(function(s) {
            if (s.plan === 'pro') mrr += pp;
            else if (s.plan === 'unlimited') mrr += up;
            else if (s.plan === 'quick48') mrr += 30;
        });
        var arr = mrr * 12;
        var el = document.getElementById('revMRR'); if (el) el.textContent = mrr.toLocaleString() + ' ج.م';
        el = document.getElementById('revARR'); if (el) el.textContent = arr.toLocaleString() + ' ج.م';
    };

    console.log('[QCV Admin] Enhancements v2 loaded — no conflicts');
})();
