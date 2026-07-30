/**
 * QCV AI Service — BluesMinds (primary) + OpenRouter (secondary) + Gemini (fallback)
 * OpenAI-compatible endpoints with Gemini REST API fallback + CORS proxy
 */
const QCVAI = {
    get _bluesmindsKey() { return (window.QCVSettings && window.QCVSettings.bluesmindsKey) || (window.QCVConfig && window.QCVConfig.bluesmindsKey) || 'sk-3YmULTcojsbSud2Gcz1QfGXVQi7eZ2oB7UepdKEYcG3wm0U6'; },
    get _bluesmindsEndpoint() { return (window.QCVConfig && window.QCVConfig.bluesmindsEndpoint) || 'https://api.bluesminds.com/v1'; },
    _bluesmindsModels: ['meta/llama-3.1-8b-instruct', 'deepseek-ai/deepseek-v4-flash', 'meta/llama-3.3-70b-instruct'],
    get _openrouterKey() { return (window.QCVSettings && window.QCVSettings.openrouterKey) || (window.QCVConfig && window.QCVConfig.openrouterKey) || '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'; },
    get _openrouterEndpoint() { return (window.QCVConfig && window.QCVConfig.openrouterEndpoint) || 'https://openrouter.ai/api/v1'; },
    _openrouterModels: ['qwen/qwen3.7-flash', 'openai/gpt-4o-mini', 'anthropic/claude-3-haiku'],
    get _geminiKey() { return (window.QCVSettings && window.QCVSettings.geminiKey) || (window.QCVConfig && window.QCVConfig.geminiKey) || ''; },
    _geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    _proxyEndpoint: 'https://corsproxy.io/?url=',
    _geminiModels: ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite-001'],
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

    async _fetch(url, body, headers, timeout) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout || 20000);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: headers || { 'Content-Type': 'application/json' },
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

    async _callBluesminds(prompt, systemPrompt, model, timeout) {
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });
        const body = { model, messages, temperature: 0.7, max_tokens: 2000 };
        const url = this._bluesmindsEndpoint + '/chat/completions';

        try {
            const res = await this._fetch(url, body, {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this._bluesmindsKey
            }, timeout);
            if (!res.ok) {
                const err = await res.text().catch(() => '');
                throw new Error('HTTP ' + res.status + ': ' + err.substring(0, 200));
            }
            const data = await res.json();
            let text = '';
            if (data.choices && data.choices[0] && data.choices[0].message) {
                text = data.choices[0].message.content || '';
            }
            text = text.replace(/```(?:html)?\s*([\s\S]*?)```/g, '$1').trim();
            if (text.length > 3000) text = text.substring(0, 3000);
            const tokens = data.usage?.total_tokens || data.usage?.completion_tokens || 0;
            this._usageLog.push({ model, tokens, time: Date.now(), provider: 'bluesminds' });
            return { ok: true, text, provider: 'bluesminds-' + model };
        } catch (e) {
            console.error('[QCV AI] BluesMinds ' + model + ' failed:', e.message);
            return { ok: false, error: e.message };
        }
    },

    async _callGemini(prompt, systemPrompt, model, timeout) {
        const fullPrompt = systemPrompt ? systemPrompt + '\n\n' + prompt : prompt;
        const body = {
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
        };
        const base = this._useProxy ? this._proxyEndpoint : '';
        const url = base + this._geminiEndpoint + '/' + model + ':generateContent?key=' + this._geminiKey;

        try {
            const res = await this._fetch(url, body, null, timeout);
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
            this._usageLog.push({ model, tokens: data.usageMetadata?.totalTokenCount || 0, time: Date.now(), provider: 'gemini' });
            return { ok: true, text, provider: 'gemini-' + model };
        } catch (e) {
            console.error('[QCV AI] Gemini ' + model + ' failed:', e.message);
            return { ok: false, error: e.message };
        }
    },

    async _callOpenRouter(prompt, systemPrompt, model, timeout) {
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });
        const body = { model, messages, temperature: 0.7, max_tokens: 2000 };
        const url = this._openrouterEndpoint + '/chat/completions';

        try {
            const res = await this._fetch(url, body, {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this._openrouterKey
            }, timeout);
            if (!res.ok) {
                const err = await res.text().catch(() => '');
                throw new Error('HTTP ' + res.status + ': ' + err.substring(0, 200));
            }
            const data = await res.json();
            let text = '';
            if (data.choices && data.choices[0] && data.choices[0].message) {
                text = data.choices[0].message.content || '';
            }
            text = text.replace(/```(?:html)?\s*([\s\S]*?)```/g, '$1').trim();
            if (text.length > 3000) text = text.substring(0, 3000);
            const tokens = data.usage?.total_tokens || data.usage?.completion_tokens || 0;
            this._usageLog.push({ model, tokens, time: Date.now(), provider: 'openrouter' });
            return { ok: true, text, provider: 'openrouter-' + model };
        } catch (e) {
            console.error('[QCV AI] OpenRouter ' + model + ' failed:', e.message);
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

        // Try providers in order — one model at a time, no retries (fast fail)
        const attempts = [
            { provider: 'openrouter', models: this._openrouterModels, key: this._openrouterKey, fn: this._callOpenRouter, timeout: 15000 },
            { provider: 'bluesminds', models: this._bluesmindsModels, key: this._bluesmindsKey, fn: this._callBluesminds, timeout: 15000 },
            { provider: 'gemini', models: this._geminiModels, key: this._geminiKey, fn: this._callGemini, timeout: 10000 }
        ];
        for (const a of attempts) {
            if (!a.key) continue;
            for (const model of a.models) {
                const res = await a.fn.call(this, prompt, systemPrompt, model, opts.timeout || a.timeout);
                if (res.ok) {
                    if (useCache) this._setCache(prompt, res);
                    return res;
                }
                lastError = res.error;
            }
        }

        // 3) Try Gemini via CORS proxy if fetch failed
        if (!this._useProxy && this._geminiKey && lastError && lastError.includes('Failed to fetch')) {
            console.log('[QCV AI] Retrying Gemini with CORS proxy...');
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
        return this.callJSON('Analyze this CV:\n1. Strengths (3-5)\n2. Weaknesses (3-5)\n3. Score (0-10)\n4. ATS friendly?\n\nCV:\n' + cvText + '\n\nJSON: {"strengths":[],"weaknesses":[],"score":7,"ats_friendly":true}', 'Expert CV analyzer.', { timeout: 20000 });
    },

    async matchJob(cvText, jd) {
        return this.callJSON('Match CV to job:\nCV:\n' + cvText + '\n\nJob:\n' + jd + '\n\nJSON: {"match_percentage":75,"matched":[],"missing":[],"recommendations":[]}', 'Job matching expert.', { timeout: 20000 });
    },

    async generateCoverLetter(cvText, jd, company) {
        return this.call('Write a cover letter (150-200 words) for ' + company + '.\nCV:\n' + cvText + '\nJob:\n' + jd, 'Professional cover letter writer. English.', { timeout: 20000 });
    },

    async generateInterviewQuestions(jobTitle, industry) {
        return this.call('5 interview questions for ' + jobTitle + ' in ' + industry + ' with answer tips.', 'Interview coach. English.', { timeout: 20000 });
    },

    async generateEmailSignature(name, title, company, phone, email) {
        return this.call('Create a professional email signature for:\nName: ' + name + '\nTitle: ' + title + '\nCompany: ' + company + '\nPhone: ' + phone + '\nEmail: ' + email + '\n\nProvide 3 different styles (Minimal, Professional, Creative). Clean HTML.', 'Email signature designer.', { timeout: 20000 });
    },

    async optimizeSkills(cvText, targetJob) {
        return this.call('Optimize skills for: ' + (targetJob || 'general') + '\n\nCV:\n' + cvText + '\n\nProvide:\n1. Top 10 technical skills\n2. Top 5 soft skills\n3. Skills to remove\n4. ATS keywords', 'Skills optimization expert.', { timeout: 20000 });
    },

    getUsageStats() {
        var now = Date.now();
        var today = this._usageLog.filter(function(u) { return now - u.time < 86400000; });
        return { total: this._usageLog.length, today: today.length, cacheSize: this._cache.size };
    }
};

window.QCVAI = QCVAI;