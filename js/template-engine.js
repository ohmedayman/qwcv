/**
 * QCV Template Engine — 30 CV Templates (15 ATS + 15 Creative)
 * Categories: ats, classic, modern, creative, photo, timeline, infographic, magazine, compact, dark
 */

const QCVTemplates = {
    registry: {},

    register(id, template) {
        this.registry[id] = template;
    },

    render(templateId, data) {
        const tpl = this.registry[templateId];
        if (!tpl) return this.registry['classic'].render(data);
        return tpl.render(data);
    },

    getAll() {
        return Object.values(this.registry).map(t => ({
            id: t.id, name: t.name, nameAr: t.nameAr,
            category: t.category, description: t.description, accent: t.accent || '#059669'
        }));
    },

    getByCategory(cat) {
        return this.getAll().filter(t => t.category === cat);
    }
};

/* ---- Helper: custom sections ---- */
function _customSections(sections) {
    if (!sections || !sections.length) return '';
    return sections.map(sec => {
        // Blank page with free content
        if (sec.content) {
            return `<div class="tpl-section"><h2 class="tpl-section-title">${sec.title.toUpperCase()}</h2><div style="white-space:pre-wrap;line-height:1.8">${sec.content}</div></div>`;
        }
        const items = (sec.items || []).filter(i => i.title || i.description);
        if (!items.length) return '';
        let h = `<div class="tpl-section"><h2 class="tpl-section-title">${sec.title.toUpperCase()}</h2>`;
        items.forEach(item => {
            h += _item(item.title, item.subtitle, item.date, item.description);
        });
        h += '</div>';
        return h;
    }).join('');
}

/* ---- Helper: contact line ---- */
function _contactLine(d) {
    const p = [];
    if (d.email) p.push(d.email);
    if (d.phone) p.push(d.phone);
    if (d.location) p.push(d.location);
    if (d.linkedin) p.push(d.linkedin);
    return p.join(' | ');
}

/* ---- Helper: section title ---- */
function _sectionTitle(title) {
    return `<h2 class="tpl-section-title">${title}</h2>`;
}

/* ---- Helper: experience/education item ---- */
function _item(left, sub, date, desc) {
    let h = `<div class="tpl-item"><div class="tpl-item-row"><span class="tpl-item-left">${left}</span><span class="tpl-item-date">${date||''}</span></div>`;
    if (sub) h += `<div class="tpl-item-sub">${sub}</div>`;
    if (desc) {
        const lines = desc.split('\n').filter(l=>l.trim()).map(l=>'<div class="tpl-bullet">• '+l.trim().replace(/^[-•]\s*/,'')+'</div>').join('');
        h += `<div class="tpl-item-desc">${lines}</div>`;
    }
    h += '</div>';
    return h;
}

/* ---- Helper: skills text ---- */
function _skillsText(skills) {
    return skills.join(', ');
}

/* ---- Helper: languages text ---- */
function _langsText(langs) {
    return langs.map(l => l.name + (l.level ? ' — ' + l.level : '')).join(' | ');
}

/* ============================================================
   TEMPLATE 1: CLASSIC — ATS-Friendly (Wozber style)
   ============================================================ */
QCVTemplates.register('classic', {
    id: 'classic', name: 'Classic', nameAr: 'كلاسيكي',
    category: 'ats', description: 'ATS-friendly single-column, clean headings, pipe-separated contact',
    accent: '#059669',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-classic">
            <div class="tc-header">
                <h1 class="tc-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tc-title">${d.title || 'JOB TITLE'}</div>
                ${contact ? `<div class="tc-contact">${contact}</div>` : ''}
            </div>
            ${d.summary ? `<div class="tpl-section">${_sectionTitle('PROFESSIONAL SUMMARY')}<p class="tpl-text">${d.summary}</p></div>` : ''}
            ${(d.experience||[]).length ? `<div class="tpl-section">${_sectionTitle('PROFESSIONAL EXPERIENCE')}${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.education||[]).length ? `<div class="tpl-section">${_sectionTitle('EDUCATION')}${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.skills||[]).length ? `<div class="tpl-section">${_sectionTitle('TECHNICAL SKILLS')}<p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
            ${(d.languages||[]).length ? `<div class="tpl-section">${_sectionTitle('LANGUAGES')}<p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
            ${_customSections(d.customSections)}
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 2: MODERN — Clean with accent header
   ============================================================ */
QCVTemplates.register('modern', {
    id: 'modern', name: 'Modern', nameAr: 'عصري',
    category: 'modern', description: 'Accent header with clean single-column body',
    accent: '#0ea5e9',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-modern">
            <div class="tm-header">
                <div class="tm-avatar">${(d.name||'Y')[0].toUpperCase()}</div>
                <div class="tm-info">
                    <h1 class="tm-name">${d.name || 'YOUR NAME'}</h1>
                    <div class="tm-title">${d.title || 'JOB TITLE'}</div>
                    ${contact ? `<div class="tm-contact">${contact}</div>` : ''}
                </div>
            </div>
            <div class="tm-body">
                ${d.summary ? `<div class="tpl-section"><h2 class="tm-section-title"><span class="tm-dot"></span>Professional Summary</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tm-section-title"><span class="tm-dot"></span>Professional Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tm-section-title"><span class="tm-dot"></span>Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tm-section-title"><span class="tm-dot"></span>Skills</h2><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
                ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tm-section-title"><span class="tm-dot"></span>Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                ${_customSections(d.customSections)}
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 3: PROFESSIONAL — ATS-optimized
   ============================================================ */
QCVTemplates.register('professional', {
    id: 'professional', name: 'Professional', nameAr: 'احترافي',
    category: 'ats', description: 'Maximum ATS compatibility, clean layout',
    accent: '#334155',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-professional">
            <div class="tp-header">
                <h1 class="tp-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tp-title">${d.title || 'JOB TITLE'}</div>
                ${contact ? `<div class="tp-contact">${contact}</div>` : ''}
            </div>
            <hr class="tp-divider">
            ${d.summary ? `<div class="tpl-section">${_sectionTitle('PROFESSIONAL SUMMARY')}<p class="tpl-text">${d.summary}</p></div>` : ''}
            ${(d.experience||[]).length ? `<div class="tpl-section">${_sectionTitle('WORK EXPERIENCE')}${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.education||[]).length ? `<div class="tpl-section">${_sectionTitle('EDUCATION')}${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.skills||[]).length ? `<div class="tpl-section">${_sectionTitle('TECHNICAL SKILLS')}<p class="tpl-skills-text">${d.skills.join(' • ')}</p></div>` : ''}
            ${(d.languages||[]).length ? `<div class="tpl-section">${_sectionTitle('LANGUAGES')}<p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
            ${_customSections(d.customSections)}
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 4: CREATIVE — Gradient header, modern feel
   ============================================================ */
QCVTemplates.register('creative', {
    id: 'creative', name: 'Creative', nameAr: 'إبداعي',
    category: 'creative', description: 'Gradient header with modern accent colors',
    accent: '#8b5cf6',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-creative">
            <div class="tc-header-creative">
                <div class="tc-avatar-creative">${(d.name||'Y')[0].toUpperCase()}</div>
                <h1 class="tc-name-creative">${d.name || 'YOUR NAME'}</h1>
                <div class="tc-title-creative">${d.title || 'JOB TITLE'}</div>
                ${contact ? `<div class="tc-contact-creative">${contact}</div>` : ''}
            </div>
            <div class="tc-body-creative">
                ${d.summary ? `<div class="tpl-section"><h2 class="tc-stitle-creative">✦ Professional Summary</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tc-stitle-creative">✦ Professional Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tc-stitle-creative">✦ Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tc-stitle-creative">✦ Skills</h2><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
                ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tc-stitle-creative">✦ Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                ${_customSections(d.customSections)}
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 5: EXECUTIVE — Serif, elegant
   ============================================================ */
QCVTemplates.register('executive', {
    id: 'executive', name: 'Executive', nameAr: 'تنفيذي',
    category: 'classic', description: 'Serif font, elegant for senior positions',
    accent: '#1e293b',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-executive">
            <div class="tex-header">
                <h1 class="tex-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tex-title">${d.title || ''}</div>
                ${contact ? `<div class="tex-contact">${contact}</div>` : ''}
            </div>
            ${d.summary ? `<div class="tpl-section"><h2 class="tex-section-title">Professional Summary</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
            ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tex-section-title">Professional Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tex-section-title">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tex-section-title">Core Competencies</h2><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
            ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tex-section-title">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
            ${_customSections(d.customSections)}
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 6: TECHNICAL — Dark header, skills sidebar
   ============================================================ */
QCVTemplates.register('technical', {
    id: 'technical', name: 'Technical', nameAr: 'تقني',
    category: 'modern', description: 'Dark header with sidebar for skills',
    accent: '#06b6d4',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-technical">
            <div class="tt-header">
                <div class="tt-left">
                    <h1 class="tt-name">${d.name || 'YOUR NAME'}</h1>
                    <div class="tt-title">${d.title || ''}</div>
                </div>
                <div class="tt-right">
                    ${d.email ? `<div>${d.email}</div>` : ''}
                    ${d.phone ? `<div>${d.phone}</div>` : ''}
                </div>
            </div>
            <div class="tt-body">
                <div class="tt-main">
                    ${d.summary ? `<div class="tpl-section"><h2 class="tt-stitle">Professional Summary</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                    ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tt-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                    ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tt-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                    ${_customSections(d.customSections)}
                </div>
                <div class="tt-sidebar">
                    ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tt-stitle">Technical Skills</h2><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
                    ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tt-stitle">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                </div>
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 7: MINIMALIST — Ultra clean
   ============================================================ */
QCVTemplates.register('minimalist', {
    id: 'minimalist', name: 'Minimalist', nameAr: 'بسيط',
    category: 'classic', description: 'Ultra clean with maximum whitespace',
    accent: '#64748b',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-minimalist">
            <div class="tmi-name">${d.name || 'YOUR NAME'}</div>
            <div class="tmi-contact">${d.title ? d.title + ' · ' : ''}${contact}</div>
            ${d.summary ? `<div class="tpl-section"><div class="tmi-stitle">SUMMARY</div><p class="tpl-text">${d.summary}</p></div>` : ''}
            ${(d.experience||[]).length ? `<div class="tpl-section"><div class="tmi-stitle">EXPERIENCE</div>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.education||[]).length ? `<div class="tpl-section"><div class="tmi-stitle">EDUCATION</div>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.skills||[]).length ? `<div class="tpl-section"><div class="tmi-stitle">SKILLS</div><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
            ${(d.languages||[]).length ? `<div class="tpl-section"><div class="tmi-stitle">LANGUAGES</div><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
            ${_customSections(d.customSections)}
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 8: SIDEBAR — Two-column with colored sidebar
   ============================================================ */
QCVTemplates.register('sidebar', {
    id: 'sidebar', name: 'Sidebar', nameAr: 'جانبي',
    category: 'modern', description: 'Two-column with colored left sidebar',
    accent: '#3b82f6',
    render(d) {
        return `
        <div class="tpl-sidebar">
            <div class="ts-left-panel">
                <div class="ts-avatar">${(d.name||'Y')[0].toUpperCase()}</div>
                <h1 class="ts-name">${d.name || 'YOUR NAME'}</h1>
                <div class="ts-title">${d.title || ''}</div>
                <div class="ts-contact-panel">
                    ${d.email ? `<div>${d.email}</div>` : ''}
                    ${d.phone ? `<div>${d.phone}</div>` : ''}
                </div>
                ${(d.skills||[]).length ? `<div class="ts-panel-section"><h3>Skills</h3><div class="ts-skills-panel">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
                ${(d.languages||[]).length ? `<div class="ts-panel-section"><h3>Languages</h3>${d.languages.map(l=>'<div class="ts-edu-item">'+l.name+(l.level?' — '+l.level:'')+'</div>').join('')}</div>` : ''}
            </div>
            <div class="ts-right-panel">
                ${d.summary ? `<div class="tpl-section"><h2 class="ts-stitle">Professional Summary</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="ts-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="ts-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                ${_customSections(d.customSections)}
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 9: TWO-COLUMN — Balanced layout
   ============================================================ */
QCVTemplates.register('two-column', {
    id: 'two-column', name: 'Two Column', nameAr: 'عمودين',
    category: 'modern', description: 'Balanced two-column layout',
    accent: '#14b8a6',
    render(d) {
        return `
        <div class="tpl-twocol">
            <div class="ttc-header">
                <h1>${d.name || 'YOUR NAME'}</h1>
                <div>${d.title || ''}</div>
                <div class="ttc-contact-line">${_contactLine(d)}</div>
            </div>
            <div class="ttc-body">
                <div class="ttc-col-main">
                    ${d.summary ? `<div class="tpl-section"><h2 class="ttc-stitle">Professional Summary</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                    ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="ttc-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                    ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="ttc-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                </div>
                <div class="ttc-col-side">
                    <div class="ttc-contact-side">
                        <h2>Contact</h2>
                        ${d.email ? `<div>${d.email}</div>` : ''}
                        ${d.phone ? `<div>${d.phone}</div>` : ''}
                    </div>
                    ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="ttc-stitle">Skills</h2><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
                    ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="ttc-stitle">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                    ${_customSections(d.customSections)}
                </div>
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 10: BOLD — Large header, strong type
   ============================================================ */
QCVTemplates.register('bold', {
    id: 'bold', name: 'Bold', nameAr: 'جريء',
    category: 'modern', description: 'Large bold header with strong typography',
    accent: '#f59e0b',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-bold">
            <div class="tb-header">
                <div class="tb-big-name">${d.name || 'YOUR NAME'}</div>
                <div class="tb-tagline">${d.title || ''}</div>
                ${contact ? `<div class="tb-contact-row">${contact}</div>` : ''}
            </div>
            <div class="tb-body">
                ${d.summary ? `<div class="tpl-section"><h2 class="tb-stitle">— Professional Summary</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tb-stitle">— Professional Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tb-stitle">— Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tb-stitle">— Skills</h2><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
                ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tb-stitle">— Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                ${_customSections(d.customSections)}
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 11: ELEGANT — Warm tones, serif
   ============================================================ */
QCVTemplates.register('elegant', {
    id: 'elegant', name: 'Elegant', nameAr: 'أنيق',
    category: 'classic', description: 'Warm tones with serif typography',
    accent: '#b45309',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-elegant">
            <div class="tel-header">
                <h1 class="tel-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tel-rule"></div>
                <div class="tel-title">${d.title || ''}</div>
                ${contact ? `<div class="tel-contact">${contact}</div>` : ''}
            </div>
            ${d.summary ? `<div class="tpl-section"><h2 class="tel-stitle">Professional Summary</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
            ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tel-stitle">Professional Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tel-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tel-stitle">Skills</h2><p class="tpl-skills-text">${d.skills.join(' • ')}</p></div>` : ''}
            ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tel-stitle">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
            ${_customSections(d.customSections)}
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 12: ATS-SAFE — Maximum ATS compatibility
   ============================================================ */
QCVTemplates.register('ats-safe', {
    id: 'ats-safe', name: 'ATS Safe', nameAr: 'آمن لل ATS',
    category: 'ats', description: 'Maximum ATS compatibility, no fancy formatting',
    accent: '#059669',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-ats">
            <div class="tats-name">${d.name || 'YOUR NAME'}</div>
            ${d.title ? `<div class="tats-title">${d.title}</div>` : ''}
            <div class="tats-contact">${contact}</div>
            ${d.summary ? `<div class="tpl-section"><div class="tats-stitle">PROFESSIONAL SUMMARY</div><p class="tpl-text">${d.summary}</p></div>` : ''}
            ${(d.experience||[]).length ? `<div class="tpl-section"><div class="tats-stitle">WORK EXPERIENCE</div>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.education||[]).length ? `<div class="tpl-section"><div class="tats-stitle">EDUCATION</div>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.skills||[]).length ? `<div class="tpl-section"><div class="tats-stitle">SKILLS</div><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
            ${(d.languages||[]).length ? `<div class="tpl-section"><div class="tats-stitle">LANGUAGES</div><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
            ${_customSections(d.customSections)}
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 13: ACADEMIC — Publications, research
   ============================================================ */
QCVTemplates.register('academic', {
    id: 'academic', name: 'Academic', nameAr: 'أكاديمي',
    category: 'classic', description: 'Academic CV with research focus',
    accent: '#7c3aed',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-academic">
            <div class="ta-header">
                <h1>${d.name || 'YOUR NAME'}</h1>
                <div class="ta-title">${d.title || ''}</div>
                ${contact ? `<div class="ta-contact">${contact}</div>` : ''}
            </div>
            ${d.summary ? `<div class="tpl-section"><h2>Research Interests</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
            ${(d.education||[]).length ? `<div class="tpl-section"><h2>Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.experience||[]).length ? `<div class="tpl-section"><h2>Professional Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.skills||[]).length ? `<div class="tpl-section"><h2>Skills & Tools</h2><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
            ${(d.languages||[]).length ? `<div class="tpl-section"><h2>Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
            ${_customSections(d.customSections)}
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 14: STARTUP — Casual, project-forward
   ============================================================ */
QCVTemplates.register('startup', {
    id: 'startup', name: 'Startup', nameAr: 'شركة ناشئة',
    category: 'modern', description: 'Dynamic style for startup culture',
    accent: '#059669',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-startup">
            <div class="tst-header">
                <div class="tst-badge">${(d.name||'Y')[0].toUpperCase()}</div>
                <div>
                    <h1>${d.name || 'YOUR NAME'}</h1>
                    <div class="tst-title">${d.title || ''}</div>
                </div>
            </div>
            ${contact ? `<div class="tst-contact">${contact}</div>` : ''}
            ${d.summary ? `<div class="tpl-section"><h2>About Me</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
            ${(d.experience||[]).length ? `<div class="tpl-section"><h2>Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.education||[]).length ? `<div class="tpl-section"><h2>Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.skills||[]).length ? `<div class="tpl-section"><h2>Tech Stack</h2><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
            ${(d.languages||[]).length ? `<div class="tpl-section"><h2>Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
            ${_customSections(d.customSections)}
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 15: INTERNATIONAL — Multilingual, clean
   ============================================================ */
QCVTemplates.register('international', {
    id: 'international', name: 'International', nameAr: 'دولي',
    category: 'modern', description: 'Clean international CV format',
    accent: '#2563eb',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-intl">
            <div class="ti-header">
                <h1 class="ti-name">${d.name || 'YOUR NAME'}</h1>
                <div class="ti-title">${d.title || ''}</div>
                ${contact ? `<div class="ti-contact">${contact}</div>` : ''}
            </div>
            <div class="ti-grid">
                <div class="ti-main">
                    ${d.summary ? `<div class="tpl-section"><h2 class="ti-stitle">Professional Summary</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                    ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="ti-stitle">Work Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                    ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="ti-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                </div>
                <div class="ti-side">
                    ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="ti-stitle">Skills</h2><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
                    ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="ti-stitle">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                </div>
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 16: PHOTO — Professional photo CV
   ============================================================ */
QCVTemplates.register('photo', {
    id: 'photo', name: 'Photo CV', nameAr: 'صور شخصية',
    category: 'photo', description: 'Professional CV with photo placeholder',
    accent: '#6366f1',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-photo">
            <div class="tp-photo-header">
                <div class="tp-photo-avatar">${(d.name||'Y')[0].toUpperCase()}</div>
                <div class="tp-photo-info">
                    <h1 class="tp-photo-name">${d.name || 'YOUR NAME'}</h1>
                    <div class="tp-photo-title">${d.title || 'JOB TITLE'}</div>
                    ${contact ? `<div class="tp-photo-contact">${contact}</div>` : ''}
                </div>
            </div>
            <div class="tp-photo-body">
                <div class="tp-photo-main">
                    ${d.summary ? `<div class="tpl-section"><h2 class="tp-photo-stitle">Professional Summary</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                    ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tp-photo-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                    ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tp-photo-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                    ${_customSections(d.customSections)}
                </div>
                <div class="tp-photo-side">
                    ${(d.skills||[]).length ? `<div class="tpl-section"><h3 class="tp-photo-sidetitle">Skills</h3><div class="tp-photo-skills">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
                    ${(d.languages||[]).length ? `<div class="tpl-section"><h3 class="tp-photo-sidetitle">Languages</h3>${d.languages.map(l=>'<div class="tp-photo-lang">'+l.name+(l.level?' — '+l.level:'')+'</div>').join('')}</div>` : ''}
                </div>
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 17: TIMELINE — Visual timeline experience
   ============================================================ */
QCVTemplates.register('timeline', {
    id: 'timeline', name: 'Timeline', nameAr: 'خط زمني',
    category: 'timeline', description: 'Experience shown as visual timeline',
    accent: '#0891b2',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-timeline">
            <div class="ttml-header">
                <h1 class="ttml-name">${d.name || 'YOUR NAME'}</h1>
                <div class="ttml-title">${d.title || ''}</div>
                ${contact ? `<div class="ttml-contact">${contact}</div>` : ''}
            </div>
            ${d.summary ? `<div class="tpl-section"><h2 class="ttml-stitle">About Me</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
            ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="ttml-stitle">Experience</h2><div class="ttml-timeline">${d.experience.map((e,i)=>'<div class="ttml-entry"><div class="ttml-dot"></div><div class="ttml-line"></div><div class="ttml-content"><div class="ttml-role">'+e.role+'</div><div class="ttml-company">'+(e.company||'')+'</div><div class="ttml-date">'+(e.duration||'')+'</div>'+(e.description?'<div class="ttml-desc">'+e.description.split('\n').filter(l=>l.trim()).map(l=>'<div>• '+l.trim().replace(/^[-•]\s*/,'')+'</div>').join('')+'</div>':'')+'</div></div>').join('')}</div></div>` : ''}
            ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="ttml-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
            ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="ttml-stitle">Skills</h2><div class="ttml-skill-tags">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
            ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="ttml-stitle">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
            ${_customSections(d.customSections)}
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 18: INFOGRAPHIC — Visual skill bars
   ============================================================ */
QCVTemplates.register('infographic', {
    id: 'infographic', name: 'Infographic', nameAr: 'إنفوغرافيك',
    category: 'infographic', description: 'Skills shown as visual progress bars',
    accent: '#7c3aed',
    render(d) {
        const contact = _contactLine(d);
        const skillBars = (d.skills||[]).map((s,i) => {
            const pct = Math.max(40, 95 - (i * 7));
            return '<div class="tinf-skill"><div class="tinf-skill-name">'+s+'</div><div class="tinf-bar-track"><div class="tinf-bar-fill" style="width:'+pct+'%"></div></div></div>';
        }).join('');
        return `
        <div class="tpl-infographic">
            <div class="tinf-header">
                <h1 class="tinf-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tinf-title">${d.title || ''}</div>
                ${contact ? `<div class="tinf-contact">${contact}</div>` : ''}
            </div>
            <div class="tinf-body">
                <div class="tinf-left">
                    ${d.summary ? `<div class="tpl-section"><h2 class="tinf-stitle">Profile</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                    ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tinf-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                    ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tinf-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                    ${_customSections(d.customSections)}
                </div>
                <div class="tinf-right">
                    ${skillBars ? '<div class="tpl-section"><h2 class="tinf-stitle">Skills</h2>'+skillBars+'</div>' : ''}
                    ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tinf-stitle">Languages</h2>${d.languages.map(l=>'<div class="tinf-lang">'+l.name+(l.level?' — '+l.level:'')+'</div>').join('')}</div>` : ''}
                </div>
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 19: MAGAZINE — Editorial/newspaper style
   ============================================================ */
QCVTemplates.register('magazine', {
    id: 'magazine', name: 'Magazine', nameAr: 'مجلة',
    category: 'magazine', description: 'Editorial newspaper-style layout',
    accent: '#dc2626',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-magazine">
            <div class="tmg-header">
                <div class="tmg-topline">${contact}</div>
                <h1 class="tmg-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tmg-rule"></div>
                <div class="tmg-title">${d.title || ''}</div>
            </div>
            <div class="tmg-cols">
                <div class="tmg-col-main">
                    ${d.summary ? `<div class="tpl-section"><h2 class="tmg-stitle">Profile</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                    ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tmg-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                </div>
                <div class="tmg-col-side">
                    ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tmg-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                    ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tmg-stitle">Skills</h2><div class="tmg-skill-tags">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
                    ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tmg-stitle">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                </div>
            </div>
            ${_customSections(d.customSections)}
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 20: COMPACT — Dense single-page
   ============================================================ */
QCVTemplates.register('compact', {
    id: 'compact', name: 'Compact', nameAr: 'مضغوط',
    category: 'compact', description: 'Dense single-page with minimal spacing',
    accent: '#475569',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-compact">
            <div class="tcmp-header">
                <div><h1 class="tcmp-name">${d.name || 'YOUR NAME'}</h1><div class="tcmp-title">${d.title || ''}</div></div>
                <div class="tcmp-contact">${contact}</div>
            </div>
            <div class="tcmp-grid">
                <div class="tcmp-col-main">
                    ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tcmp-stitle">EXPERIENCE</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                    ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tcmp-stitle">EDUCATION</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                    ${_customSections(d.customSections)}
                </div>
                <div class="tcmp-col-side">
                    ${d.summary ? `<div class="tpl-section"><h2 class="tcmp-stitle">PROFILE</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                    ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tcmp-stitle">SKILLS</h2><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
                    ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tcmp-stitle">LANGUAGES</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                </div>
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 21: DARK — Dark background theme
   ============================================================ */
QCVTemplates.register('dark', {
    id: 'dark', name: 'Dark Theme', nameAr: 'داكن',
    category: 'dark', description: 'Dark background with light text',
    accent: '#1e1e2e',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-dark">
            <div class="tdk-header">
                <h1 class="tdk-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tdk-title">${d.title || ''}</div>
                ${contact ? `<div class="tdk-contact">${contact}</div>` : ''}
            </div>
            <div class="tdk-body">
                ${d.summary ? `<div class="tpl-section"><h2 class="tdk-stitle">Profile</h2><p class="tdk-text">${d.summary}</p></div>` : ''}
                ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tdk-stitle">Experience</h2>${d.experience.map(e=>'<div class="tdk-item"><div class="tdk-item-row"><span class="tdk-item-left">'+e.role+'</span><span class="tdk-item-date">'+(e.duration||'')+'</span></div>'+(e.company?'<div class="tdk-item-sub">'+e.company+'</div>':'')+(e.description?'<div class="tdk-item-desc">'+e.description.split('\n').filter(l=>l.trim()).map(l=>'<div>• '+l.trim().replace(/^[-•]\s*/,'')+'</div>').join('')+'</div>':'')+'</div>').join('')}</div>` : ''}
                ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tdk-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tdk-stitle">Skills</h2><div class="tdk-skill-tags">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
                ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tdk-stitle">Languages</h2><p class="tdk-text">${_langsText(d.languages)}</p></div>` : ''}
                ${_customSections(d.customSections)}
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 22: GRADIENT — Gradient header
   ============================================================ */
QCVTemplates.register('gradient', {
    id: 'gradient', name: 'Gradient', nameAr: 'تدرج لوني',
    category: 'creative', description: 'Smooth gradient header with modern body',
    accent: '#a855f7',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-gradient">
            <div class="tgr-header">
                <h1 class="tgr-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tgr-title">${d.title || ''}</div>
                ${contact ? `<div class="tgr-contact">${contact}</div>` : ''}
            </div>
            <div class="tgr-body">
                ${d.summary ? `<div class="tpl-section"><h2 class="tgr-stitle">About Me</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tgr-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tgr-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tgr-stitle">Skills</h2><div class="tgr-skill-tags">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
                ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tgr-stitle">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                ${_customSections(d.customSections)}
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 23: CARD — Each section in a card/box
   ============================================================ */
QCVTemplates.register('card', {
    id: 'card', name: 'Card Layout', nameAr: 'بطاقات',
    category: 'modern', description: 'Each section wrapped in a card',
    accent: '#0ea5e9',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-card">
            <div class="tcd-header">
                <h1 class="tcd-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tcd-title">${d.title || ''}</div>
                ${contact ? `<div class="tcd-contact">${contact}</div>` : ''}
            </div>
            <div class="tcd-body">
                ${d.summary ? `<div class="tcd-card"><h2 class="tcd-stitle">Profile</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                ${(d.experience||[]).length ? `<div class="tcd-card"><h2 class="tcd-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                <div class="tcd-row">
                    ${(d.education||[]).length ? `<div class="tcd-card tcd-half"><h2 class="tcd-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                    ${(d.skills||[]).length ? `<div class="tcd-card tcd-half"><h2 class="tcd-stitle">Skills</h2><div class="tcd-skill-tags">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
                </div>
                ${(d.languages||[]).length ? `<div class="tcd-card"><h2 class="tcd-stitle">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                ${_customSections(d.customSections)}
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 24: SPLIT — Split header two-tone
   ============================================================ */
QCVTemplates.register('split', {
    id: 'split', name: 'Split Header', nameAr: 'مقسم',
    category: 'modern', description: 'Two-tone split header design',
    accent: '#ea580c',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-split">
            <div class="tsplit-header">
                <div class="tsplit-left">
                    <h1 class="tsplit-name">${d.name || 'YOUR NAME'}</h1>
                    <div class="tsplit-title">${d.title || ''}</div>
                </div>
                <div class="tsplit-right">
                    ${d.email ? '<div>'+d.email+'</div>' : ''}
                    ${d.phone ? '<div>'+d.phone+'</div>' : ''}
                    ${d.location ? '<div>'+d.location+'</div>' : ''}
                </div>
            </div>
            <div class="tsplit-body">
                ${d.summary ? `<div class="tpl-section"><h2 class="tsplit-stitle">Profile</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tsplit-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tsplit-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tsplit-stitle">Skills</h2><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
                ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tsplit-stitle">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                ${_customSections(d.customSections)}
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 25: MONO — Monogram large initial
   ============================================================ */
QCVTemplates.register('mono', {
    id: 'mono', name: 'Monogram', nameAr: 'أحرف كبيرة',
    category: 'classic', description: 'Large monogram initial as design element',
    accent: '#374151',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-mono">
            <div class="tmo-left">
                <div class="tmo-initial">${(d.name||'Y')[0].toUpperCase()}</div>
                <div class="tmo-contact">
                    ${d.email ? '<div>'+d.email+'</div>' : ''}
                    ${d.phone ? '<div>'+d.phone+'</div>' : ''}
                    ${d.location ? '<div>'+d.location+'</div>' : ''}
                </div>
                ${(d.skills||[]).length ? `<div class="tpl-section"><h3 class="tmo-sidetitle">Skills</h3><div class="tmo-skills">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
                ${(d.languages||[]).length ? `<div class="tpl-section"><h3 class="tmo-sidetitle">Languages</h3>${d.languages.map(l=>'<div class="tmo-lang">'+l.name+(l.level?' — '+l.level:'')+'</div>').join('')}</div>` : ''}
            </div>
            <div class="tmo-right">
                <h1 class="tmo-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tmo-title">${d.title || ''}</div>
                ${d.summary ? `<div class="tpl-section"><h2 class="tmo-stitle">Profile</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tmo-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tmo-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                ${_customSections(d.customSections)}
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 26: BANNER — Full-width banner header
   ============================================================ */
QCVTemplates.register('banner', {
    id: 'banner', name: 'Banner', nameAr: 'بانر',
    category: 'modern', description: 'Full-width banner header with clean body',
    accent: '#059669',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-banner">
            <div class="tbn-banner">
                <h1 class="tbn-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tbn-title">${d.title || ''}</div>
                ${contact ? `<div class="tbn-contact">${contact}</div>` : ''}
            </div>
            <div class="tbn-body">
                ${d.summary ? `<div class="tpl-section"><h2 class="tbn-stitle">Profile</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tbn-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tbn-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="tbn-stitle">Skills</h2><div class="tbn-skill-tags">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
                ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="tbn-stitle">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                ${_customSections(d.customSections)}
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 27: TIMELINE-SIDEBAR — Timeline in sidebar
   ============================================================ */
QCVTemplates.register('timeline-sidebar', {
    id: 'timeline-sidebar', name: 'Timeline Sidebar', nameAr: 'خط زمني جانبي',
    category: 'timeline', description: 'Timeline layout with sidebar for details',
    accent: '#0d9488',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-tlsidebar">
            <div class="ttls-header">
                <h1 class="ttls-name">${d.name || 'YOUR NAME'}</h1>
                <div class="ttls-title">${d.title || ''}</div>
            </div>
            <div class="ttls-body">
                <div class="ttls-main">
                    ${d.summary ? `<div class="tpl-section"><h2 class="ttls-stitle">Profile</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                    ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="ttls-stitle">Experience</h2><div class="ttls-timeline">${d.experience.map(e=>'<div class="ttls-entry"><div class="ttls-dot"></div><div class="ttls-content"><strong>'+e.role+'</strong>'+(e.company?' — '+e.company:'')+(e.duration?'<div class="ttls-date">'+e.duration+'</div>':'')+(e.description?'<div class="ttls-desc">'+e.description.split('\n').filter(l=>l.trim()).map(l=>'<div>• '+l.trim().replace(/^[-•]\s*/,'')+'</div>').join('')+'</div>':'')+'</div></div>').join('')}</div></div>` : ''}
                    ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="ttls-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                    ${_customSections(d.customSections)}
                </div>
                <div class="ttls-side">
                    <div class="ttls-contact-panel">
                        ${d.email ? '<div>'+d.email+'</div>' : ''}
                        ${d.phone ? '<div>'+d.phone+'</div>' : ''}
                        ${d.location ? '<div>'+d.location+'</div>' : ''}
                    </div>
                    ${(d.skills||[]).length ? `<div class="tpl-section"><h3 class="ttls-sidetitle">Skills</h3><div class="ttls-skills">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
                    ${(d.languages||[]).length ? `<div class="tpl-section"><h3 class="ttls-sidetitle">Languages</h3>${d.languages.map(l=>'<div class="ttls-lang">'+l.name+(l.level?' — '+l.level:'')+'</div>').join('')}</div>` : ''}
                </div>
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 28: MINIMAL-PHOTO — Minimal with photo area
   ============================================================ */
QCVTemplates.register('minimal-photo', {
    id: 'minimal-photo', name: 'Minimal Photo', nameAr: 'بسيط بالصورة',
    category: 'photo', description: 'Clean minimal with photo placeholder',
    accent: '#6b7280',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-mlphoto">
            <div class="tmlp-top">
                <div class="tmlp-avatar">${(d.name||'Y')[0].toUpperCase()}</div>
                <div class="tmlp-info">
                    <h1 class="tmlp-name">${d.name || 'YOUR NAME'}</h1>
                    <div class="tmlp-title">${d.title || ''}</div>
                    ${contact ? `<div class="tmlp-contact">${contact}</div>` : ''}
                </div>
            </div>
            <div class="tmlp-divider"></div>
            <div class="tmlp-body">
                <div class="tmlp-main">
                    ${d.summary ? `<div class="tpl-section"><h2 class="tmlp-stitle">Profile</h2><p class="tpl-text">${d.summary}</p></div>` : ''}
                    ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="tmlp-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                    ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="tmlp-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                    ${_customSections(d.customSections)}
                </div>
                <div class="tmlp-side">
                    ${(d.skills||[]).length ? `<div class="tpl-section"><h3 class="tmlp-sidetitle">Skills</h3><p class="tpl-skills-text">${_skillsText(d.skills)}</p></div>` : ''}
                    ${(d.languages||[]).length ? `<div class="tpl-section"><h3 class="tmlp-sidetitle">Languages</h3><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
                </div>
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 29: EXECUTIVE-DARK — Dark executive
   ============================================================ */
QCVTemplates.register('executive-dark', {
    id: 'executive-dark', name: 'Executive Dark', nameAr: 'تنفيذي داكن',
    category: 'dark', description: 'Dark executive with gold accents',
    accent: '#92400e',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-exdark">
            <div class="ted-header">
                <div class="ted-left">
                    <h1 class="ted-name">${d.name || 'YOUR NAME'}</h1>
                    <div class="ted-title">${d.title || ''}</div>
                </div>
                <div class="ted-right">
                    ${d.email ? '<div>'+d.email+'</div>' : ''}
                    ${d.phone ? '<div>'+d.phone+'</div>' : ''}
                </div>
            </div>
            <div class="ted-body">
                ${d.summary ? `<div class="tpl-section"><h2 class="ted-stitle">Professional Summary</h2><p class="ted-text">${d.summary}</p></div>` : ''}
                ${(d.experience||[]).length ? `<div class="tpl-section"><h2 class="ted-stitle">Experience</h2>${d.experience.map(e=>'<div class="ted-item"><div class="ted-item-row"><span class="ted-item-left">'+e.role+'</span><span class="ted-item-date">'+(e.duration||'')+'</span></div>'+(e.company?'<div class="ted-item-sub">'+e.company+'</div>':'')+(e.description?'<div class="ted-item-desc">'+e.description.split('\n').filter(l=>l.trim()).map(l=>'<div>• '+l.trim().replace(/^[-•]\s*/,'')+'</div>').join('')+'</div>':'')+'</div>').join('')}</div>` : ''}
                ${(d.education||[]).length ? `<div class="tpl-section"><h2 class="ted-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.skills||[]).length ? `<div class="tpl-section"><h2 class="ted-stitle">Skills</h2><div class="ted-skill-tags">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
                ${(d.languages||[]).length ? `<div class="tpl-section"><h2 class="ted-stitle">Languages</h2><p class="ted-text">${_langsText(d.languages)}</p></div>` : ''}
                ${_customSections(d.customSections)}
            </div>
        </div>`;
    }
});

/* ============================================================
   TEMPLATE 30: CREATIVE-GRID — Grid-based creative
   ============================================================ */
QCVTemplates.register('creative-grid', {
    id: 'creative-grid', name: 'Creative Grid', nameAr: 'شبكة إبداعية',
    category: 'creative', description: 'Grid-based creative layout',
    accent: '#e11d48',
    render(d) {
        const contact = _contactLine(d);
        return `
        <div class="tpl-cgrid">
            <div class="tcg-header">
                <h1 class="tcg-name">${d.name || 'YOUR NAME'}</h1>
                <div class="tcg-title">${d.title || ''}</div>
                ${contact ? `<div class="tcg-contact">${contact}</div>` : ''}
            </div>
            <div class="tcg-grid">
                <div class="tcg-item tcg-wide">
                    ${d.summary ? `<h2 class="tcg-stitle">Profile</h2><p class="tpl-text">${d.summary}</p>` : ''}
                </div>
                ${(d.experience||[]).length ? `<div class="tcg-item tcg-wide"><h2 class="tcg-stitle">Experience</h2>${d.experience.map(e=>_item(e.role, e.company, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.education||[]).length ? `<div class="tcg-item"><h2 class="tcg-stitle">Education</h2>${d.education.map(e=>_item(e.degree, e.school, e.duration, e.description)).join('')}</div>` : ''}
                ${(d.skills||[]).length ? `<div class="tcg-item"><h2 class="tcg-stitle">Skills</h2><div class="tcg-skill-tags">${d.skills.map(s=>'<span>'+s+'</span>').join('')}</div></div>` : ''}
                ${(d.languages||[]).length ? `<div class="tcg-item"><h2 class="tcg-stitle">Languages</h2><p class="tpl-skills-text">${_langsText(d.languages)}</p></div>` : ''}
            </div>
            ${_customSections(d.customSections)}
        </div>`;
    }
});
