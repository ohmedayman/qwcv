/**
 * QCV AI Service — Google Gemini API
 * Uses REST API with CORS proxy fallback
 */
const QCVAI = {
    _apiKey: (window.QCVConfig && window.QCVConfig.geminiKey) || '',
    _endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    _proxyEndpoint: 'https://corsproxy.io/?url=',
    _models: ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite-001'],
    _cache: new Map(),
    _cacheExpiry: 5 * 60 * 1000,
    _usageLog: [],
    _useProxy: false,

    _hash(prompt) {
        let h = 0;
        for (let i = 0; i < prompt.length; i++) { h = ((h << 5) - h) + prompt.charCodeAt(i); h = h & h; }
        return h.toString(36);
    },

    _getCached(prompt) {
        const c = this._cache.get(this._hash(prompt));
        if (c && Date.now() - c.time < this._cacheExpiry) return c;
        this._cache.delete(this._hash(prompt));
        return null;
    },

    _setCache(prompt, data) {
        this._cache.set(this._hash(prompt), { ...data, time: Date.now() });
    },

    async _fetch(url, body, timeout) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout || 15000);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: ctrl.signal
            });
            clearTimeout(timer);
            return res;
        } catch (e) {
            clearTimeout(timer);
            throw e;
        }
    },

    async _callGemini(prompt, systemPrompt, model, timeout) {
        const fullPrompt = systemPrompt ? systemPrompt + '\n\n' + prompt : prompt;
        const body = {
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
        };

        const base = this._useProxy ? this._proxyEndpoint : '';
        const url = base + this._endpoint + '/' + model + ':generateContent?key=' + this._apiKey;

        try {
            const res = await this._fetch(url, body, timeout);
            if (!res.ok) {
                const err = await res.text().catch(() => '');
                throw new Error('HTTP ' + res.status + ': ' + err.substring(0, 200));
            }
            const data = await res.json();
            let text = '';
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                text = data.candidates[0].content.parts.map(p => p.text || '').join('');
            }
            text = text.replace(/```(?:html)?\s*([\s\S]*?)```/g, '$1').trim();
            if (text.length > 3000) text = text.substring(0, 3000);
            this._usageLog.push({ model, tokens: data.usageMetadata?.totalTokenCount || 0, time: Date.now() });
            return { ok: true, text, provider: 'gemini-' + model };
        } catch (e) {
            console.error('[QCV AI] ' + model + ' failed:', e.message);
            return { ok: false, error: e.message };
        }
    },

    async call(prompt, systemPrompt, opts) {
        opts = opts || {};
        const useCache = opts.useCache !== false;
        if (useCache) {
            const c = this._getCached(prompt);
            if (c) return c;
        }

        let lastError = null;
        for (let i = 0; i < this._models.length; i++) {
            for (let retry = 0; retry < 2; retry++) {
                const res = await this._callGemini(prompt, systemPrompt, this._models[i], opts.timeout || 15000);
                if (res.ok) {
                    if (useCache) this._setCache(prompt, res);
                    return res;
                }
                lastError = res.error;
                if (retry < 1) await new Promise(r => setTimeout(r, 1000 * (retry + 1)));
            }
        }

        if (!this._useProxy && lastError && lastError.includes('Failed to fetch')) {
            console.log('[QCV AI] Retrying with CORS proxy...');
            this._useProxy = true;
            return this.call(prompt, systemPrompt, opts);
        }

        return { ok: false, error: lastError || 'AI service unavailable' };
    },

    async callJSON(prompt, systemPrompt, opts) {
        const res = await this.call(prompt, systemPrompt, Object.assign({}, opts, { useCache: false }));
        if (!res.ok) return res;
        try {
            return { ok: true, text: res.text, json: JSON.parse(res.text), provider: res.provider };
        } catch (e) {
            const m = res.text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (m) { try { return { ok: true, text: res.text, json: JSON.parse(m[1].trim()), provider: res.provider }; } catch (e2) { } }
            return { ok: false, error: 'Failed to parse JSON', provider: res.provider };
        }
    },

    async analyzeCV(cvText) {
        return this.callJSON('Analyze this CV:\n1. Strengths (3-5)\n2. Weaknesses (3-5)\n3. Score (0-10)\n4. ATS friendly?\n\nCV:\n' + cvText + '\n\nJSON: {"strengths":[],"weaknesses":[],"score":7,"ats_friendly":true}', 'Expert CV analyzer.', { timeout: 15000 });
    },

    async matchJob(cvText, jd) {
        return this.callJSON('Match CV to job:\nCV:\n' + cvText + '\n\nJob:\n' + jd + '\n\nJSON: {"match_percentage":75,"matched":[],"missing":[],"recommendations":[]}', 'Job matching expert.', { timeout: 15000 });
    },

    async generateCoverLetter(cvText, jd, company) {
        return this.call('Write a cover letter (150-200 words) for ' + company + '.\nCV:\n' + cvText + '\nJob:\n' + jd, 'Professional cover letter writer. English.', { timeout: 15000 });
    },

    async generateInterviewQuestions(jobTitle, industry) {
        return this.call('5 interview questions for ' + jobTitle + ' in ' + industry + ' with answer tips.', 'Interview coach. English.', { timeout: 15000 });
    },

    async generateEmailSignature(name, title, company, phone, email) {
        return this.call('Create a professional email signature for:\nName: ' + name + '\nTitle: ' + title + '\nCompany: ' + company + '\nPhone: ' + phone + '\nEmail: ' + email + '\n\nProvide 3 different styles (Minimal, Professional, Creative). Clean HTML.', 'Email signature designer.', { timeout: 15000 });
    },

    async optimizeSkills(cvText, targetJob) {
        return this.call('Optimize skills for: ' + (targetJob || 'general') + '\n\nCV:\n' + cvText + '\n\nProvide:\n1. Top 10 technical skills\n2. Top 5 soft skills\n3. Skills to remove\n4. ATS keywords', 'Skills optimization expert.', { timeout: 15000 });
    },

    getUsageStats() {
        var now = Date.now();
        var today = this._usageLog.filter(function(u) { return now - u.time < 86400000; });
        return { total: this._usageLog.length, today: today.length, cacheSize: this._cache.size };
    }
};

window.QCVAI = QCVAI;
