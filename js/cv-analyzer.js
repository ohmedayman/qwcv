/**
 * QCV AI CV Analyzer — Detailed scoring with specific issue tracking
 * Shows exactly what's missing so users can reach 100%
 */

const CVAnalyzer = {
    analyze(data) {
        const content = this.scoreContent(data);
        const ats = this.scoreATS(data);
        const skills = this.scoreSkills(data);
        const impact = this.scoreImpact(data);
        const contact = this.scoreContact(data);
        const overall = Math.round(
            content.total * 0.25 +
            ats.total * 0.25 +
            skills.total * 0.2 +
            impact.total * 0.15 +
            contact.total * 0.15
        );
        return {
            overall,
            content,
            ats,
            skills,
            impact,
            contact,
            recommendations: this.getRecommendations(data, { content, ats, skills, impact, contact })
        };
    },

    scoreContent(data) {
        const issues = [];
        let score = 0;
        const max = 100;
        const summary = (data.summary || '').trim();
        const exp = data.experience || [];
        const edu = data.education || [];

        // Summary scoring
        if (summary.length === 0) {
            issues.push({ type: 'critical', text: 'أضف ملخصاً مهنياً (2-3 أسطر عن خبرتك)', section: 'summary', fix: '+15' });
        } else if (summary.length < 50) {
            score += 8;
            issues.push({ type: 'warning', text: `الملخص قصير جداً (${summary.length}/100 حرف) — أضف تفاصيل عن إنجازاتك`, section: 'summary', fix: '+7' });
        } else if (summary.length < 100) {
            score += 15;
            issues.push({ type: 'info', text: `ملخص جيد — وسّعه لـ 100+ حرف لتحسين التقييم`, section: 'summary', fix: '+5' });
        } else if (summary.length < 150) {
            score += 20;
            issues.push({ type: 'info', text: 'ملخص قوي — أضف أرقام/نتائج لزيادة التأثير', section: 'summary', fix: '+5' });
        } else {
            score += 25;
        }

        // Experience count
        if (exp.length === 0) {
            issues.push({ type: 'critical', text: 'أضف خبرة عمل واحدة على الأقل', section: 'experience', fix: '+10' });
        } else {
            score += 10;
            if (exp.length >= 2) score += 10;
            if (exp.length >= 3) score += 5;
            if (exp.length < 2) {
                issues.push({ type: 'warning', text: 'أضف خ Asking تجربتين+ لسيرة ذاتية أقوى', section: 'experience', fix: '+10' });
            }
        }

        // Experience bullet points
        let totalBullets = 0;
        exp.forEach((e, i) => {
            const bullets = (e.description || '').split('\n').filter(l => l.trim().length > 5);
            totalBullets += bullets.length;
            if (bullets.length === 0) {
                issues.push({ type: 'critical', text: `الخبرة #${i + 1} بدون وصف — أضف 3-5 نقاط إنجاز`, section: 'experience', fix: '+5' });
            } else if (bullets.length < 3) {
                score += 2;
                issues.push({ type: 'warning', text: `الخبرة #${i + 1}: ${bullets.length} نقطة فقط — أضف ${3 - bullets.length} نقاط إضافية`, section: 'experience', fix: '+3' });
            } else {
                score += 5;
                if (bullets.length >= 5) score += 5;
            }
        });

        // Education
        if (edu.length === 0) {
            issues.push({ type: 'info', text: 'أضف مؤهلاتك التعليمية', section: 'education', fix: '+5' });
        } else {
            score += 5;
            edu.forEach((e, i) => {
                if (!(e.degree || '').trim()) issues.push({ type: 'info', text: `التعليم #${i + 1}: أضف اسم الشهادة`, section: 'education', fix: '+3' });
                else score += 3;
                if (!(e.school || '').trim()) issues.push({ type: 'info', text: `التعليم #${i + 1}: أضف اسم المؤسسة`, section: 'education', fix: '+2' });
                else score += 2;
            });
        }

        // LinkedIn check
        if ((data.linkedin || '').trim()) score += 5;

        return { total: Math.min(100, score), max, issues };
    },

    scoreATS(data) {
        const issues = [];
        let score = 0;
        const max = 100;

        // Name
        if (!(data.name || '').trim()) {
            issues.push({ type: 'critical', text: 'أضف اسمك الكامل', section: 'personal', fix: '+10' });
        } else { score += 10; }

        // Email
        if (!(data.email || '').trim()) {
            issues.push({ type: 'critical', text: 'أضف بريدك الإلكتروني', section: 'personal', fix: '+10' });
        } else { score += 10; }

        // Phone
        if (!(data.phone || '').trim()) {
            issues.push({ type: 'critical', text: 'أضف رقم هاتفك', section: 'personal', fix: '+10' });
        } else { score += 10; }

        // Job title
        if (!(data.title || '').trim()) {
            issues.push({ type: 'warning', text: 'أضف المسمى الوظيفي (مثال: "مهندس برمجيات")', section: 'personal', fix: '+10' });
        } else { score += 10; }

        // Summary
        if (!(data.summary || '').trim()) {
            issues.push({ type: 'critical', text: 'أضف ملخصاً مهنياً لأنظمة ATS', section: 'summary', fix: '+10' });
        } else { score += 10; }

        // LinkedIn
        if (!(data.linkedin || '').trim()) {
            issues.push({ type: 'warning', text: 'أضف رابط LinkedIn — أنظمة ATS تبحث عنه', section: 'personal', fix: '+5' });
        } else { score += 5; }

        // Location
        if (!(data.location || '').trim()) {
            issues.push({ type: 'info', text: 'أضف موقعك (المدينة، الدولة) لتحسين الفرص المحلية', section: 'personal', fix: '+5' });
        } else { score += 5; }

        // Section headers check — ATS needs proper structure
        const exp = data.experience || [];
        const edu = data.education || [];
        const skills = data.skills || [];

        if (exp.length === 0) {
            issues.push({ type: 'critical', text: 'قسم الخبرة العملية مطلوب لأنظمة ATS', section: 'experience', fix: '+10' });
        } else { score += 10; }

        if (edu.length === 0) {
            issues.push({ type: 'warning', text: 'قسم التعليم يساعد أنظمة ATS في تصنيفك', section: 'education', fix: '+5' });
        } else { score += 5; }

        if (skills.length < 3) {
            issues.push({ type: 'critical', text: `المهارات قليلة جداً (${skills.length}) — ATS يحتاج 3-5 مهارات`, section: 'skills', fix: '+5' });
        } else { score += 5; }

        // Experience completeness for ATS
        exp.forEach((e, i) => {
            if (!(e.role || '').trim()) {
                issues.push({ type: 'warning', text: `الخبرة #${i + 1}: المسمى الوظيفي مطلوب`, section: 'experience', fix: '+3' });
            } else { score += 2; }
            if (!(e.company || '').trim()) {
                issues.push({ type: 'warning', text: `الخبرة #${i + 1}: اسم الشركة مطلوب`, section: 'experience', fix: '+2' });
            } else { score += 2; }
            if (!(e.duration || '').trim()) {
                issues.push({ type: 'info', text: `الخبرة #${i + 1}: أضف المدة (مثال "2022 - حتى الآن")`, section: 'experience', fix: '+1' });
            } else { score += 1; }
        });

        return { total: Math.min(100, score), max, issues };
    },

    scoreSkills(data) {
        const issues = [];
        let score = 0;
        const max = 100;
        const skills = data.skills || [];

        if (skills.length === 0) {
            issues.push({ type: 'critical', text: 'لا توجد مهارات — أهم ما تبحث عنه أنظمة ATS', section: 'skills', fix: '+25' });
        } else {
            score += 10;
            if (skills.length >= 3) score += 15;
            if (skills.length >= 5) score += 10;
            if (skills.length >= 8) score += 10;
            if (skills.length >= 12) score += 10;
        }

        if (skills.length > 0 && skills.length < 5) {
            issues.push({ type: 'warning', text: `فقط ${skills.length} مهارة — استهدف 8-12 مهارة`, section: 'skills', fix: '+15' });
        }

        if (skills.length >= 5 && skills.length < 8) {
            issues.push({ type: 'info', text: `جيد (${skills.length} مهارات) — أضف 3+ مهارات إضافية`, section: 'skills', fix: '+10' });
        }

        // Long skills hurt ATS parsing
        const longSkills = skills.filter(s => s.length > 20);
        if (longSkills.length > 0) {
            score -= 5;
            issues.push({ type: 'warning', text: `${longSkills.length} مهارة طويلة (+20 حرف) — اختصرها لأنظمة ATS`, section: 'skills', fix: '+5' });
        } else if (skills.length > 0) {
            score += 5;
        }

        // Conciseness bonus
        if (skills.length > 0 && skills.every(s => s.length <= 20)) score += 5;

        return { total: Math.min(100, Math.max(0, score)), max, issues };
    },

    scoreImpact(data) {
        const issues = [];
        let score = 0;
        const max = 100;
        const exp = data.experience || [];
        const allDescriptions = exp.map(e => e.description || '').join(' ');

        // Numbers/metrics
        const numbers = allDescriptions.match(/\d+/g) || [];
        if (numbers.length === 0 && exp.length > 0) {
            issues.push({ type: 'critical', text: 'لا توجد أرقام في الخبرات — أضف نتائج قابلة للقياس (مثال "زدت المبيعات 30%")', section: 'experience', fix: '+15' });
        } else {
            score += 15;
            if (numbers.length >= 3) score += 10;
            if (numbers.length >= 5) score += 10;
        }

        if (numbers.length > 0 && numbers.length < 3 && exp.length > 0) {
            issues.push({ type: 'warning', text: `فقط ${numbers.length} رقم — أضف 3+ أرقام لتأثير أقوى`, section: 'experience', fix: '+10' });
        }

        // Power verbs
        const powerVerbs = ['lead', 'managed', 'developed', 'designed', 'built', 'achieved', 'increased', 'reduced', 'improved', 'launched', 'created', 'implemented', 'optimized', 'delivered', 'قاد', 'أدرت', 'طورت', 'صممت', 'بنيت', 'حققت', 'زدت', 'قللت', 'حسنت', 'أطلقت', 'نفذت', 'أنشأت'];
        const lower = allDescriptions.toLowerCase();
        const matched = powerVerbs.filter(v => lower.includes(v));
        if (matched.length === 0 && exp.length > 0) {
            issues.push({ type: 'warning', text: 'لا توجد أفعال إجراء — ابدأ كل نقطة بـ "قاد"، "طور"، "حقق"', section: 'experience', fix: '+10' });
        } else {
            score += 10;
            if (matched.length >= 3) score += 5;
        }

        if (matched.length > 0 && matched.length < 3 && exp.length > 0) {
            issues.push({ type: 'info', text: `وجد ${matched.length} فعل إجراء — استخدم 3+ أفعال مختلفة`, section: 'experience', fix: '+5' });
        }

        // Bullet points count
        const bullets = allDescriptions.split('\n').filter(l => l.trim().length > 10);
        if (bullets.length === 0 && exp.length > 0) {
            issues.push({ type: 'critical', text: 'لا توجد نقاط إنجاز في الخبرة — استخدم فواصل الأسطر', section: 'experience', fix: '+10' });
        } else {
            score += 10;
            if (bullets.length >= 5) score += 5;
        }

        if (bullets.length > 0 && bullets.length < 5 && exp.length > 0) {
            issues.push({ type: 'info', text: `فقط ${bullets.length} نقطة — استهدف 5+ نقاط في كل الخبرات`, section: 'experience', fix: '+5' });
        }

        // Percentage or currency symbols
        if (allDescriptions.includes('%') || allDescriptions.includes('$') || allDescriptions.includes('EGP')) {
            score += 10;
        } else if (exp.length > 0) {
            issues.push({ type: 'info', text: 'أضف نسب مئوية أو قيم مالية لإظهار نتائج ملموسة', section: 'experience', fix: '+10' });
        }

        // Summary numbers
        const summary = (data.summary || '').toLowerCase();
        if (summary.match(/\d+/)) {
            score += 5;
        } else if ((data.summary || '').trim().length > 0) {
            issues.push({ type: 'info', text: 'أضف رقماً لملخصك لانطباع أول أقوى', section: 'summary', fix: '+5' });
        }

        return { total: Math.min(100, Math.max(0, score)), max, issues };
    },

    scoreContact(data) {
        const issues = [];
        let score = 0;
        const max = 100;

        if (!(data.name || '').trim()) {
            issues.push({ type: 'critical', text: 'الاسم مطلوب', section: 'personal', fix: '+25' });
        } else { score += 25; }

        if (!(data.email || '').trim()) {
            issues.push({ type: 'critical', text: 'البريد الإلكتروني مطلوب', section: 'personal', fix: '+25' });
        } else { score += 25; }

        if (!(data.phone || '').trim()) {
            issues.push({ type: 'critical', text: 'رقم الهاتف مطلوب', section: 'personal', fix: '+25' });
        } else { score += 25; }

        if (!(data.title || '').trim()) {
            issues.push({ type: 'warning', text: 'المسمى الوظيفي يساعد في العثور عليك', section: 'personal', fix: '+25' });
        } else { score += 25; }

        return { total: Math.min(100, score), max, issues };
    },

    getRecommendations(data, scores) {
        const recs = [];

        const allIssues = [
            ...scores.contact.issues,
            ...scores.content.issues,
            ...scores.ats.issues,
            ...scores.skills.issues,
            ...scores.impact.issues
        ];

        const seen = new Set();
        allIssues.forEach(issue => {
            const key = issue.section + '|' + issue.text;
            if (!seen.has(key)) {
                seen.add(key);
                recs.push({
                    type: issue.type,
                    icon: issue.type === 'critical' ? '\u2716' : issue.type === 'warning' ? '\u26A0' : '\u2139',
                    title: issue.text,
                    section: issue.section,
                    fix: issue.fix
                });
            }
        });

        const order = { critical: 0, warning: 1, info: 2 };
        recs.sort((a, b) => (order[a.type] || 3) - (order[b.type] || 3));

        return recs;
    },

    getGrade(score) {
        if (score >= 95) return { grade: 'ممتاز', label: 'PERFECT', color: '#059669', emoji: '\uD83C\uDFC6' };
        if (score >= 90) return { grade: 'ممتاز', label: 'EXCELLENT', color: '#059669', emoji: '\uD83C\uDFC6' };
        if (score >= 75) return { grade: 'جيد جداً', label: 'VERY GOOD', color: '#0ea5e9', emoji: '\u2B50' };
        if (score >= 60) return { grade: 'جيد', label: 'GOOD', color: '#f59e0b', emoji: '\uD83D\uDC4D' };
        if (score >= 40) return { grade: 'مقبول', label: 'FAIR', color: '#f97316', emoji: '\uD83D\uDCC8' };
        return { grade: 'يحتاج تحسين', label: 'NEEDS WORK', color: '#ef4444', emoji: '\uD83D\uDD27' };
    },

    async getAISuggestions(data, scores) {
        if (!window.QCVAI) return null;

        const cvText = [
            data.name ? 'Name: ' + data.name : '',
            data.title ? 'Title: ' + data.title : '',
            data.summary ? 'Summary: ' + data.summary : '',
            (data.skills || []).join(', '),
            (data.experience || []).map(e => (e.role || '') + ' at ' + (e.company || '') + ': ' + (e.description || '')).join('\n')
        ].filter(Boolean).join('\n');

        const weakCategories = [];
        if (scores.content.total < 70) weakCategories.push('Content (' + scores.content.total + '/100)');
        if (scores.ats.total < 70) weakCategories.push('ATS (' + scores.ats.total + '/100)');
        if (scores.skills.total < 70) weakCategories.push('Skills (' + scores.skills.total + '/100)');
        if (scores.impact.total < 70) weakCategories.push('Impact (' + scores.impact.total + '/100)');
        if (scores.contact.total < 70) weakCategories.push('Contact (' + scores.contact.total + '/100)');

        if (weakCategories.length === 0) return null;

        const prompt = 'You are an elite CV consultant. Analyze this CV with score ' + scores.overall + '/100.\n\n' +
            'CV:\n' + cvText + '\n\n' +
            'Weak areas: ' + weakCategories.join(', ') + '\n\n' +
            'Provide exactly 5 specific, actionable improvements (not generic advice). Format:\n' +
            '1. [Section] \u2014 Specific improvement with example\n' +
            '2. [Section] \u2014 Specific improvement with example\n' +
            '...\n\n' +
            'Keep each point under 30 words. Be specific to THIS person\'s CV.';

        const res = await QCVAI.call(prompt, null, { maxRetries: 1 });
        return res.ok ? res.text : null;
    }
};