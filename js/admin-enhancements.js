// ===== QCV Admin Enhancements =====
// Adds: Subscription Expiry, User Filters, Bulk Actions, Edit Modals, Audit Log, Staff Permissions, Commission Payout

(function(){
    if(!window.DB) return;
    var DB = window.DB;

    // ===== AUDIT LOG =====
    window.auditLog = function(action, detail) {
        restPost('/auditLog', { action: action, detail: detail || '', admin: sessionStorage.getItem('qcv_staff') ? JSON.parse(sessionStorage.getItem('qcv_staff')).data.name : 'المدير', timestamp: Date.now() });
    };

    // ===== 1. SUBSCRIPTION EXPIRY CHECK =====
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
        if(!expired.length) return;
        for(var i = 0; i < expired.length; i++) {
            await restPatch('/users/' + expired[i].uid, { plan: 'free', planExpiry: null, downloads: 0 });
        }
        auditLog('auto_downgrade', 'تم تنزيل ' + expired.length + ' اشتراك منتهي');
        showToast('تم تنزيل ' + expired.length + ' اشتراك منتهي تلقائياً', 'info');
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

    // ===== 2. USER FILTERS =====
    window.userFilterPlan = 'all';
    window.userFilterStatus = 'all';
    window.userSelected = {};

    function addUserFilters() {
        var head = document.querySelector('#panel-users .table-head');
        if(!head || document.getElementById('userFilters')) return;
        var f = document.createElement('div');
        f.id = 'userFilters';
        f.style.cssText = 'display:flex;gap:8px;padding:12px 20px;border-bottom:1px solid var(--border);flex-wrap:wrap;align-items:center';
        f.innerHTML = '<select id="filterPlan" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;font-size:.78rem;font-weight:700;background:#fff;cursor:pointer" onchange="applyUserFilters()"><option value="all">كل الباقات</option><option value="free">مجانية</option><option value="pro">احترافية</option><option value="unlimited">غير محدودة</option></select>' +
            '<select id="filterStatus" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;font-size:.78rem;font-weight:700;background:#fff;cursor:pointer" onchange="applyUserFilters()"><option value="all">الكل</option><option value="active">نشط</option><option value="banned">محظور</option><option value="expired">منتهي</option></select>' +
            '<div style="margin-right:auto;display:flex;gap:6px;flex-wrap:wrap" id="bulkActions" style="display:none">' +
                '<span id="selectedCount" style="font-size:.75rem;color:var(--muted);font-weight:700;padding:7px 0"></span>' +
                '<button class="btn-sm" onclick="bulkBan()" style="font-size:.72rem;padding:5px 10px"><i class="fas fa-ban"></i> حظر</button>' +
                '<button class="btn-sm" onclick="bulkUnban()" style="font-size:.72rem;padding:5px 10px"><i class="fas fa-unlock"></i> فك الحظر</button>' +
                '<button class="btn-sm" onclick="bulkChangePlan()" style="font-size:.72rem;padding:5px 10px"><i class="fas fa-exchange-alt"></i> تغيير باقة</button>' +
                '<button class="btn-sm" onclick="bulkMessage()" style="font-size:.72rem;padding:5px 10px"><i class="fas fa-envelope"></i> رسالة</button>' +
                '<button class="btn-danger-sm" onclick="bulkDelete()" style="font-size:.72rem;padding:5px 10px"><i class="fas fa-trash"></i> حذف</button>' +
            '</div>';
        head.parentNode.insertBefore(f, head.nextSibling);
    }

    window.applyUserFilters = function() {
        var q = (document.getElementById('searchUsers') ? document.getElementById('searchUsers').value : '').toLowerCase();
        var plan = document.getElementById('filterPlan') ? document.getElementById('filterPlan').value : 'all';
        var status = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : 'all';
        var now = Date.now();
        var filtered = {};
        Object.entries(window.allUsers).forEach(function(e) {
            var u = e[1];
            var match = true;
            if(q && (u.name||'').toLowerCase().indexOf(q) === -1 && (u.email||'').toLowerCase().indexOf(q) === -1) match = false;
            if(plan !== 'all' && (u.plan||'free') !== plan) match = false;
            if(status === 'active' && u.banned) match = false;
            if(status === 'banned' && !u.banned) match = false;
            if(status === 'expired' && (!u.planExpiry || u.planExpiry >= now || (u.plan||'free') === 'free')) match = false;
            if(match) filtered[e[0]] = e[1];
        });
        renderUsersTable(filtered);
    };

    function renderUsersTable(data) {
        var ut = document.getElementById('allUsers');
        if(!ut) return;
        var entries = Object.entries(data || window.allUsers);
        var checkboxes = Object.keys(window.userSelected).length > 0;
        ut.innerHTML = entries.length ? entries.map(function(e) {
            var uid = e[0], u = e[1], pl = u.plan || 'free', b = u.banned === true, c = getAvatarColor(uid);
            var prov = u.authProvider === 'google.com' ? '<i class="fab fa-google" style="color:#4285f4;font-size:.7rem;margin-right:4px"></i>' : '';
            var authBadge = u.authOnly ? '<span style="font-size:.6rem;background:rgba(245,158,11,.1);color:#f59e0b;padding:2px 6px;border-radius:4px;margin-right:4px;font-weight:600">جديد</span>' : '';
            var checked = window.userSelected[uid] ? 'checked' : '';
            var expired = (pl !== 'free' && u.planExpiry && u.planExpiry < Date.now());
            var expiryBadge = expired ? ' <span style="font-size:.6rem;background:rgba(239,68,68,.1);color:#ef4444;padding:2px 5px;border-radius:4px">منتهي</span>' : '';
            return '<tr style="'+(window.userSelected[uid]?'background:rgba(0,3,201,.04)':'')+'"><td style="width:32px"><input type="checkbox" '+checked+' onchange="toggleUserSelect(\''+escHtml(uid)+'\',this.checked)" style="cursor:pointer;accent-color:var(--accent)"></td><td><div class="user-cell"><div class="user-avatar" style="background:'+c+'">'+escHtml((u.name||'U')[0].toUpperCase())+'</div><div class="user-info"><div class="name">'+authBadge+escHtml(u.name||'مستخدم')+'</div><div class="email">'+prov+escHtml(u.email||'-')+'</div></div></div></td><td><span class="badge '+planBadgeClass(pl)+'">'+planText(pl)+'</span>'+expiryBadge+'</td><td>'+formatDate(u.registeredAt)+'</td><td>'+formatDateTime(u.lastLogin)+'</td><td>'+(b?'<span class="badge badge-banned">محظور</span>':'<span class="badge badge-active">نشط</span>')+'</td><td><div class="actions"><button class="btn-action btn-view" onclick="viewUser(\''+escHtml(uid)+'\')"><i class="fas fa-eye"></i></button><button class="btn-action btn-change-plan" onclick="changePlan(\''+escHtml(uid)+'\')"><i class="fas fa-exchange-alt"></i></button>'+(b?'<button class="btn-action btn-unban" onclick="toggleBan(\''+escHtml(uid)+'\',false)"><i class="fas fa-unlock"></i></button>':'<button class="btn-action btn-ban" onclick="toggleBan(\''+escHtml(uid)+'\',true)"><i class="fas fa-ban"></i></button>')+'<button class="btn-action btn-delete" onclick="deleteUser(\''+escHtml(uid)+'\')"><i class="fas fa-trash"></i></button></div></td></tr>';
        }).join('') : '<tr><td colspan="7" class="empty-state"><p>لا يوجد مستخدمين</p></td></tr>';
        // Update selected count
        var sc = document.getElementById('selectedCount');
        var sel = Object.keys(window.userSelected).length;
        if(sc) sc.textContent = sel > 0 ? sel + ' محدد' : '';
    }

    window.toggleUserSelect = function(uid, checked) {
        if(checked) window.userSelected[uid] = true;
        else delete window.userSelected[uid];
        applyUserFilters();
    };

    window.selectAllUsers = function() {
        var all = {};
        Object.keys(window.allUsers).forEach(function(uid){ all[uid] = true; });
        window.userSelected = all;
        applyUserFilters();
    };

    // ===== BULK ACTIONS =====
    window.bulkBan = async function() {
        var ids = Object.keys(window.userSelected);
        if(!ids.length) { showToast('حدد مستخدمين أولاً', 'error'); return; }
        if(!confirm('حظر ' + ids.length + ' مستخدم؟')) return;
        for(var i=0;i<ids.length;i++) await restPatch('/users/'+ids[i],{banned:true});
        auditLog('bulk_ban', 'حظر '+ids.length+' مستخدم');
        window.userSelected = {};
        showToast('تم حظر '+ids.length+' مستخدم','success');
        loadAllData();
    };

    window.bulkUnban = async function() {
        var ids = Object.keys(window.userSelected);
        if(!ids.length) { showToast('حدد مستخدمين أولاً', 'error'); return; }
        for(var i=0;i<ids.length;i++) await restPatch('/users/'+ids[i],{banned:false});
        auditLog('bulk_unban', 'فك حظر '+ids.length+' مستخدم');
        window.userSelected = {};
        showToast('تم فك حظر '+ids.length+' مستخدم','success');
        loadAllData();
    };

    window.bulkChangePlan = function() {
        var ids = Object.keys(window.userSelected);
        if(!ids.length) { showToast('حدد مستخدمين أولاً', 'error'); return; }
        document.getElementById('modalTitle').textContent = 'تغيير باقة '+ids.length+' مستخدم';
        document.getElementById('modalBody').innerHTML = '<div class="field" style="margin-bottom:12px"><label>الباقة الجديدة</label><select id="bulkPlan"><option value="free">مجانية</option><option value="pro">احترافية</option><option value="unlimited">غير محدودة</option></select></div><div class="field"><label>المدة (أيام)</label><input type="number" id="bulkDays" value="30"></div>';
        document.getElementById('modalConfirm').style.display='block';
        document.getElementById('modalConfirm').textContent='تحديث '+ids.length;
        document.getElementById('modalConfirm').onclick=async function(){
            var plan=document.getElementById('bulkPlan').value;
            var days=parseInt(document.getElementById('bulkDays').value)||30;
            var expiry=plan==='free'?null:Date.now()+(days*86400000);
            for(var i=0;i<ids.length;i++) await restPatch('/users/'+ids[i],{plan:plan,planExpiry:expiry});
            auditLog('bulk_plan_change','تغيير باقة '+ids.length+' مستخدم إلى '+plan);
            window.userSelected={};
            closeModal();
            showToast('تم تحديث باقة '+ids.length+' مستخدم','success');
            loadAllData();
        };
        document.getElementById('modal').classList.add('show');
    };

    window.bulkMessage = function() {
        var ids = Object.keys(window.userSelected);
        if(!ids.length) { showToast('حدد مستخدمين أولاً', 'error'); return; }
        document.getElementById('modalTitle').textContent = 'إرسال رسالة لـ '+ids.length+' مستخدم';
        document.getElementById('modalBody').innerHTML = '<div class="field" style="margin-bottom:12px"><label>نوع الرسالة</label><select id="bulkMsgType"><option value="info">معلوماتية</option><option value="warning">تحذير</option><option value="success">تهنئة</option><option value="promo">عرض خاص</option></select></div><div class="field"><label>الرسالة</label><textarea id="bulkMsgText" placeholder="اكتب رسالتك هنا..." style="min-height:80px;width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;font-family:Cairo,sans-serif"></textarea></div>';
        document.getElementById('modalConfirm').style.display='block';
        document.getElementById('modalConfirm').textContent='إرسال';
        document.getElementById('modalConfirm').onclick=async function(){
            var type=document.getElementById('bulkMsgType').value;
            var text=document.getElementById('bulkMsgText').value.trim();
            if(!text){showToast('اكتب الرسالة','error');return;}
            var msgData={type:type,text:text,sentAt:Date.now(),read:false,from:'admin'};
            var updates={};
            ids.forEach(function(uid){updates['users/'+uid+'/notifications/'+Date.now()]=msgData;});
            await fetch(DB+'.json',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(updates)});
            auditLog('bulk_message','إرسال رسالة لـ '+ids.length+' مستخدم');
            closeModal();
            showToast('تم إرسال الرسالة لـ '+ids.length+' مستخدم','success');
        };
        document.getElementById('modal').classList.add('show');
    };

    window.bulkDelete = async function() {
        var ids = Object.keys(window.userSelected);
        if(!ids.length) { showToast('حدد مستخدمين أولاً', 'error'); return; }
        if(!confirm('حذف '+ids.length+' مستخدم نهائياً؟ لا يمكن التراجع!')) return;
        for(var i=0;i<ids.length;i++) await restDelete('/users/'+ids[i]);
        auditLog('bulk_delete','حذف '+ids.length+' مستخدم');
        window.userSelected = {};
        showToast('تم حذف '+ids.length+' مستخدم','success');
        loadAllData();
    };

    // ===== 3. EDIT MODALS =====
    window.editJob = function(id) {
        var j = window.allJobs[id]; if(!j) return;
        document.getElementById('modalTitle').textContent = 'تعديل وظيفة';
        document.getElementById('modalBody').innerHTML = '<div class="field" style="margin-bottom:12px"><label>المسمى الوظيفي</label><input type="text" id="editJobTitle" value="'+escHtml(j.title||'')+'"></div><div class="field" style="margin-bottom:12px"><label>الفئة</label><input type="text" id="editJobCategory" value="'+escHtml(j.category||'')+'"></div><div class="field" style="margin-bottom:12px"><label>الموقع</label><input type="text" id="editJobLocation" value="'+escHtml(j.location||'')+'"></div><div class="field" style="margin-bottom:12px"><label>الوصف</label><textarea id="editJobDesc" style="min-height:80px;width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;font-family:Cairo,sans-serif">'+escHtml(j.description||'')+'</textarea></div><div class="field"><label>الحالة</label><select id="editJobActive"><option value="true"'+(j.active!==false?' selected':'')+'>نشطة</option><option value="false"'+(j.active===false?' selected':'')+'>معطلة</option></select></div>';
        document.getElementById('modalConfirm').style.display='block';
        document.getElementById('modalConfirm').textContent='حفظ';
        document.getElementById('modalConfirm').onclick=async function(){
            await restPatch('/jobs/'+id,{title:document.getElementById('editJobTitle').value,category:document.getElementById('editJobCategory').value,location:document.getElementById('editJobLocation').value,description:document.getElementById('editJobDesc').value,active:document.getElementById('editJobActive').value==='true'});
            auditLog('edit_job','تعديل وظيفة: '+document.getElementById('editJobTitle').value);
            closeModal();showToast('تم تحديث الوظيفة','success');loadAllData();
        };
        document.getElementById('modal').classList.add('show');
    };

    window.editStaff = function(id) {
        var s = window.allStaff[id]; if(!s) return;
        var permDefs = [{k:'view_users',l:'عرض المستخدمين'},{k:'manage_users',l:'إدارة المستخدمين'},{k:'manage_staff',l:'إدارة الموظفين'},{k:'manage_subscriptions',l:'إدارة الاشتراكات'},{k:'manage_jobs',l:'إدارة الوظائف'},{k:'manage_settings',l:'إدارة الإعدادات'},{k:'manage_affiliate',l:'إدارة التسويق'},{k:'send_messages',l:'إرسال الرسائل'}];
        var perms = s.permissions || [];
        var permHTML = permDefs.map(function(p){return '<label style="display:flex;align-items:center;gap:6px;padding:6px 0;font-size:.82rem;cursor:pointer"><input type="checkbox" value="'+p.k+'" '+(perms.indexOf(p.k)!==-1?'checked':'')+' style="accent-color:var(--accent)"> '+p.l+'</label>';}).join('');
        document.getElementById('modalTitle').textContent = 'تعديل موظف';
        document.getElementById('modalBody').innerHTML = '<div class="field" style="margin-bottom:12px"><label>الاسم</label><input type="text" id="editStaffName" value="'+escHtml(s.name||'')+'"></div><div class="field" style="margin-bottom:12px"><label>البريد</label><input type="email" id="editStaffEmail" value="'+escHtml(s.email||'')+'"></div><div class="field" style="margin-bottom:12px"><label>كلمة المرور الجديدة (اتركها فاضية لو عايزها كما هي)</label><input type="password" id="editStaffPass" placeholder="اتركها فاضية"></div><div class="field" style="margin-bottom:12px"><label>الدور</label><select id="editStaffRole"><option value="support"'+(s.role==='support'?' selected':'')+'>دعم فني</option><option value="manager"'+(s.role==='manager'?' selected':'')+'>مدير قسم</option><option value="admin"'+(s.role==='admin'?' selected':'')+'>مدير</option><option value="super_admin"'+(s.role==='super_admin'?' selected':'')+'>مدير عام</option></select></div><div class="field" style="margin-bottom:12px"><label>الحالة</label><select id="editStaffActive"><option value="true"'+(s.active!==false?' selected':'')+'>نشط</option><option value="false"'+(s.active===false?' selected':'')+'>غير نشط</option></select></div><div class="settings-card" style="margin-top:12px;border:1px solid var(--border);border-radius:12px;padding:14px"><h4 style="font-size:.82rem;font-weight:800;margin-bottom:10px"><i class="fas fa-key"></i> الصلاحيات</h4>'+permHTML+'</div>';
        document.getElementById('modalConfirm').style.display='block';
        document.getElementById('modalConfirm').textContent='حفظ';
        document.getElementById('modalConfirm').onclick=async function(){
            var newPerms=[];
            document.querySelectorAll('#modalBody input[type=checkbox]:checked').forEach(function(cb){newPerms.push(cb.value);});
            var update={name:document.getElementById('editStaffName').value,email:document.getElementById('editStaffEmail').value,role:document.getElementById('editStaffRole').value,permissions:newPerms,active:document.getElementById('editStaffActive').value==='true'};
            var pass=document.getElementById('editStaffPass').value.trim();
            if(pass) update.password=pass;
            await restPatch('/staff/'+id,update);
            auditLog('edit_staff','تعديل موظف: '+update.name);
            closeModal();showToast('تم تحديث الموظف','success');loadAllData();
        };
        document.getElementById('modal').classList.add('show');
    };

    window.editDomain = function(id) {
        var d = window.allDomains[id]; if(!d) return;
        document.getElementById('modalTitle').textContent = 'تعديل نطاق';
        document.getElementById('modalBody').innerHTML = '<div class="field" style="margin-bottom:12px"><label>النطاق</label><input type="text" id="editDomainName" value="'+escHtml(d.domain||'')+'" style="direction:ltr;text-align:left"></div><div class="field" style="margin-bottom:12px"><label>الباقة المطلوبة</label><select id="editDomainPlan"><option value="free"'+(d.plan==='free'?' selected':'')+'>مجانية</option><option value="pro"'+(d.plan==='pro'?' selected':'')+'>احترافية</option><option value="unlimited"'+(d.plan==='unlimited'?' selected':'')+'>غير محدودة</option></select></div><div class="field" style="margin-bottom:12px"><label>المدة (أيام)</label><input type="number" id="editDomainDuration" value="'+(d.duration||30)+'"></div><div class="field"><label>الحالة</label><select id="editDomainActive"><option value="true"'+(d.active!==false?' selected':'')+'>نشطة</option><option value="false"'+(d.active===false?' selected':'')+'>معطلة</option></select></div>';
        document.getElementById('modalConfirm').style.display='block';
        document.getElementById('modalConfirm').textContent='حفظ';
        document.getElementById('modalConfirm').onclick=async function(){
            await restPatch('/domains/'+id,{domain:document.getElementById('editDomainName').value,plan:document.getElementById('editDomainPlan').value,duration:parseInt(document.getElementById('editDomainDuration').value)||30,active:document.getElementById('editDomainActive').value==='true'});
            auditLog('edit_domain','تعديل نطاق: '+document.getElementById('editDomainName').value);
            closeModal();showToast('تم تحديث النطاق','success');loadAllData();
        };
        document.getElementById('modal').classList.add('show');
    };

    window.editCampaign = function(id) {
        var c = window.allCampaigns[id]; if(!c) return;
        document.getElementById('modalTitle').textContent = 'تعديل حملة';
        document.getElementById('modalBody').innerHTML = '<div class="field" style="margin-bottom:12px"><label>اسم الحملة</label><input type="text" id="editCampName" value="'+escHtml(c.name||'')+'"></div><div class="field"><label>كود الحملة</label><input type="text" id="editCampCode" value="'+escHtml(c.code||'')+'" style="direction:ltr;text-align:left"></div>';
        document.getElementById('modalConfirm').style.display='block';
        document.getElementById('modalConfirm').textContent='حفظ';
        document.getElementById('modalConfirm').onclick=async function(){
            await restPatch('/affiliateCampaigns/'+id,{name:document.getElementById('editCampName').value,code:document.getElementById('editCampCode').value});
            auditLog('edit_campaign','تعديل حملة: '+document.getElementById('editCampName').value);
            closeModal();showToast('تم تحديث الحملة','success');loadAllData();
        };
        document.getElementById('modal').classList.add('show');
    };

    // ===== 4. COMMISSION PAYOUT =====
    window.markCommissionPaid = async function(id) {
        await restPatch('/affiliateCommissions/'+id,{status:'paid',paidAt:Date.now()});
        auditLog('commission_paid','تحديد عمولة كمدفوعة: '+id);
        showToast('تم تحديد العمولة كمدفوعة','success');
        loadAllData();
    };

    window.markCommissionUnpaid = async function(id) {
        await restPatch('/affiliateCommissions/'+id,{status:'pending',paidAt:null});
        auditLog('commission_unpaid','إلغاء دفع عمولة: '+id);
        showToast('تم إلغاء دفع العمولة','warning');
        loadAllData();
    };

    // ===== 5. EXPIRED SUBSCRIPTIONS PANEL =====
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

    // ===== 6. AUDIT LOG PANEL =====
    window.showAuditLog = function() {
        restGet('/auditLog.json').then(function(data){
            document.getElementById('modalTitle').textContent = 'سجل الأحداث';
            var entries = Object.values(data||{}).sort(function(a,b){return (b.timestamp||0)-(a.timestamp||0)}).slice(0,50);
            if(!entries.length) {
                document.getElementById('modalBody').innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)">لا توجد أحداث مسجلة</div>';
            } else {
                var html = '<div style="max-height:400px;overflow-y:auto">';
                entries.forEach(function(e){
                    var icon='fas fa-info-circle',color='var(--accent)';
                    if(e.action.indexOf('ban')!==-1){icon='fas fa-ban';color='var(--red)';}
                    else if(e.action.indexOf('approve')!==-1||e.action.indexOf('plan')!==-1){icon='fas fa-check';color='var(--green)';}
                    else if(e.action.indexOf('delete')!==-1){icon='fas fa-trash';color='var(--red)';}
                    else if(e.action.indexOf('edit')!==-1){icon='fas fa-edit';color='var(--yellow)';}
                    else if(e.action.indexOf('message')!==-1){icon='fas fa-envelope';color='var(--accent)';}
                    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)"><div style="width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.75rem;background:'+color+'15;color:'+color+'"><i class="'+icon+'"></i></div><div style="flex:1"><div style="font-weight:700;font-size:.8rem">'+escHtml(e.detail||e.action)+'</div><div style="font-size:.7rem;color:var(--muted)">'+escHtml(e.admin||'-')+' · '+formatDateTime(e.timestamp)+'</div></div></div>';
                });
                html += '</div>';
                document.getElementById('modalBody').innerHTML = html;
            }
            document.getElementById('modalConfirm').style.display='none';
            document.getElementById('modal').classList.add('show');
        });
    };

    // ===== ENHANCE EXISTING TABLES WITH EDIT BUTTONS =====
    function enhanceJobsTable() {
        var jt = document.getElementById('jobsList');
        if(!jt) return;
        var jobs = Object.entries(window.allJobs);
        jt.innerHTML = jobs.length ? jobs.map(function(e){
            var j=e[1];
            return '<tr><td><strong>'+escHtml(j.title)+'</strong></td><td>'+escHtml(j.category||'')+'</td><td>'+escHtml(j.location||'')+'</td><td>'+(j.active!==false?'<span class="badge badge-active">نشطة</span>':'<span class="badge badge-inactive">معطلة</span>')+'</td><td>'+formatDate(j.createdAt)+'</td><td><div class="actions"><button class="btn-action btn-edit" onclick="editJob(\''+e[0]+'\')"><i class="fas fa-edit"></i></button><button class="btn-action btn-delete" onclick="deleteJob(\''+e[0]+'\')"><i class="fas fa-trash"></i></button></div></td></tr>';
        }).join('') : '<tr><td colspan="6" class="empty-state"><p>لا توجد وظائف</p></td></tr>';
    }

    function enhanceStaffTable() {
        var sft = document.getElementById('staffList');
        if(!sft) return;
        var staff = Object.entries(window.allStaff);
        sft.innerHTML = staff.length ? staff.map(function(e){
            var id=e[0],s=e[1],c=getAvatarColor(id);
            var permCount = (s.permissions||[]).length;
            return '<tr><td><div class="user-cell"><div class="user-avatar" style="background:'+c+'">'+escHtml((s.name||'M')[0].toUpperCase())+'</div><div class="user-info"><div class="name">'+escHtml(s.name)+'</div><div class="email">'+escHtml(s.email)+'</div></div></div></td><td><span class="badge '+roleBadgeClass(s.role)+'">'+roleText(s.role)+'</span></td><td><span style="font-size:.78rem;color:var(--muted);cursor:pointer" onclick="editStaff(\''+id+'\')">'+permCount+' صلاحية</span></td><td>'+(s.active!==false?'<span class="badge badge-active">نشط</span>':'<span class="badge badge-inactive">غير نشط</span>')+'</td><td><div class="actions"><button class="btn-action btn-edit" onclick="editStaff(\''+id+'\')"><i class="fas fa-edit"></i></button><button class="btn-action btn-delete" onclick="deleteStaff(\''+id+'\')"><i class="fas fa-trash"></i></button></div></td></tr>';
        }).join('') : '<tr><td colspan="5" class="empty-state"><p>لا يوجد موظفين</p></td></tr>';
    }

    function enhanceDomainsTable() {
        var dt = document.getElementById('domainsList');
        if(!dt) return;
        var doms = Object.entries(window.allDomains);
        dt.innerHTML = doms.length ? doms.map(function(e){
            var d=e[1];
            return '<tr><td><strong style="direction:ltr;display:inline-block">'+escHtml(d.domain)+'</strong></td><td><span class="badge '+planBadgeClass(d.plan)+'">'+planText(d.plan)+'</span></td><td>'+(d.duration||1)+'</td><td>0</td><td>'+(d.active!==false?'<span class="badge badge-active">نشطة</span>':'<span class="badge badge-inactive">معطلة</span>')+'</td><td><div class="actions"><button class="btn-action btn-edit" onclick="editDomain(\''+e[0]+'\')"><i class="fas fa-edit"></i></button><button class="btn-action btn-delete" onclick="deleteDomain(\''+e[0]+'\')"><i class="fas fa-trash"></i></button></div></td></tr>';
        }).join('') : '<tr><td colspan="6" class="empty-state"><p>لا توجد نطاقات</p></td></tr>';
    }

    function enhanceCampaignsTable() {
        var cmpT = document.getElementById('campaignsList');
        if(!cmpT) return;
        var camps = Object.entries(window.allCampaigns);
        cmpT.innerHTML = camps.length ? camps.map(function(e){
            var c=e[1];
            return '<tr><td><strong>'+escHtml(c.name||'')+'</strong></td><td style="direction:ltr;text-align:left">'+escHtml(c.code||'')+'</td><td>'+(c.clicks||0)+'</td><td>'+(c.conversions||0)+'</td><td><div class="actions"><button class="btn-action btn-edit" onclick="editCampaign(\''+e[0]+'\')"><i class="fas fa-edit"></i></button><button class="btn-action btn-delete" onclick="deleteCampaign(\''+e[0]+'\')"><i class="fas fa-trash"></i></button></div></td></tr>';
        }).join('') : '<tr><td colspan="5" class="empty-state"><p>لا توجد حملات</p></td></tr>';
    }

    function enhanceCommissionsTable() {
        var cmmT = document.getElementById('commissionsList');
        if(!cmmT) return;
        var comms = Object.entries(window.allCommissions);
        cmmT.innerHTML = comms.length ? comms.map(function(e){
            var c=e[1], isPaid = c.status==='paid';
            return '<tr><td>'+escHtml(c.userName||c.uid||'-')+'</td><td>'+(c.amount||0)+' ج.م</td><td><span class="badge '+(isPaid?'badge-approved':'badge-pending')+'">'+(isPaid?'مدفوع':'معلق')+'</span></td><td>'+formatDateTime(c.createdAt)+'</td><td><div class="actions">'+(isPaid?'<button class="btn-action btn-reject" onclick="markCommissionUnpaid(\''+e[0]+'\')" title="إلغاء الدفع"><i class="fas fa-undo"></i></button>':'<button class="btn-action btn-approve" onclick="markCommissionPaid(\''+e[0]+'\')" title="تحديد كمدفوع"><i class="fas fa-check"></i></button>')+'</div></td></tr>';
        }).join('') : '<tr><td colspan="5" class="empty-state"><p>لا توجد عمولات</p></td></tr>';
    }

    // ===== ADD AUDIT LOG BUTTON TO TOPBAR =====
    function addAuditButton() {
        var right = document.querySelector('.topbar-right');
        if(!right || document.getElementById('auditBtn')) return;
        var btn = document.createElement('button');
        btn.id = 'auditBtn';
        btn.className = 'btn-sm';
        btn.style.cssText = 'font-size:.78rem;padding:6px 12px';
        btn.innerHTML = '<i class="fas fa-history"></i> سجل الأحداث';
        btn.onclick = showAuditLog;
        right.insertBefore(btn, right.firstChild);
    }

    // ===== ADD EXPIRED BUTTON TO SUBSCRIPTIONS =====
    function addExpiredButton() {
        var head = document.querySelector('#panel-subscriptions .table-head .actions');
        if(!head || document.getElementById('expiredBtn')) return;
        var btn = document.createElement('button');
        btn.id = 'expiredBtn';
        btn.className = 'btn-danger-sm';
        btn.style.cssText = 'font-size:.78rem';
        var expired = checkExpiredSubscriptions();
        btn.innerHTML = '<i class="fas fa-clock"></i> منتهية ('+expired.length+')';
        btn.onclick = showExpiredPanel;
        head.insertBefore(btn, head.firstChild);
    }

    // ===== OVERRIDE loadAllData TO ENHANCE =====
    var _origLoad = window.loadAllData || window.checkAndLoad;
    var _origCheck = window.checkAndLoad;
    window.checkAndLoad = function() {
        return _origCheck.apply(this, arguments).then(function(result){
            setTimeout(function(){
                addUserFilters();
                addAuditButton();
                addExpiredButton();
                renderExpiredBadge();
                enhanceJobsTable();
                enhanceStaffTable();
                enhanceDomainsTable();
                enhanceCampaignsTable();
                enhanceCommissionsTable();
            }, 100);
            return result;
        });
    };

    // ===== OVERRIDE filterUsers TO USE NEW FILTERS =====
    var _origFilter = window.filterUsers;
    window.filterUsers = function() {
        if(document.getElementById('filterPlan')) {
            applyUserFilters();
        } else if(_origFilter) {
            _origFilter();
        }
    };

    // ===== OVERRIDE addJob, showAddStaff, showAddCampaign TO ADD AUDIT =====
    var _origAddJob = window.addJob;
    window.addJob = function() { _origAddJob(); var _origConfirm = document.getElementById('modalConfirm').onclick; document.getElementById('modalConfirm').onclick = async function(){ await _origConfirm(); auditLog('add_job','إضافة وظيفة جديدة'); }; };

    var _origAddStaff = window.showAddStaff;
    window.showAddStaff = function() { _origAddStaff(); var _origConfirm = document.getElementById('modalConfirm').onclick; document.getElementById('modalConfirm').onclick = async function(){ await _origConfirm(); auditLog('add_staff','إضافة موظف جديد'); }; };

    var _origAddCamp = window.showAddCampaign;
    window.showAddCampaign = function() { _origAddCamp(); var _origConfirm = document.getElementById('modalConfirm').onclick; document.getElementById('modalConfirm').onclick = async function(){ await _origConfirm(); auditLog('add_campaign','إضافة حملة جديدة'); }; };

    var _origAddDomain = window.showAddDomain;
    window.showAddDomain = function() { _origAddDomain(); var _origConfirm = document.getElementById('modalConfirm').onclick; document.getElementById('modalConfirm').onclick = async function(){ await _origConfirm(); auditLog('add_domain','إضافة نطاق جديد'); }; };

    // ===== AUTO-DOWNGRADE ON LOAD =====
    setTimeout(function(){
        var expired = checkExpiredSubscriptions();
        if(expired.length > 0) {
            autoDowngradeExpired();
        }
    }, 3000);

    console.log('[QCV Admin] Enhancements loaded');
})();
