/**
 * QCV AI Service — OpenRouter API
 * Unified AI with caching, retry, and model fallback
 */
const QCVAI = {
    /** OpenRouter API key — loaded from config.js */
    _apiKey: (window.QCVConfig && window.QCVConfig.openrouterKey) || '',

    /** OpenRouter endpoint */
    _endpoint: (window.QCVConfig && window.QCVConfig.openrouterEndpoint) || 'https://openrouter.ai/api/v1/chat/completions',

    /** Available models in priority order */
    _models: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini', 'openai/gpt-4.1-nano'],

    /** Response cache */
    _cache: new Map(),
    _cacheExpiry: 5 * 60 * 1000,

    _getCached(prompt) {
        const key = this._hashPrompt(prompt);
        const cached = this._cache.get(key);
        if (cached && Date.now() - cached.time < this._cacheExpiry) return cached.data;
        this._cache.delete(key);
        return null;
    },

    _setCache(prompt, data) {
        const key = this._hashPrompt(prompt);
        this._cache.set(key, { data, time: Date.now() });
        if (this._cache.size > 100) {
            const firstKey = this._cache.keys().next().value;
            this._cache.delete(firstKey);
        }
    },

    _hashPrompt(prompt) {
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString(36);
    },

    /**
     * Call OpenRouter API
     */
    async _callOpenRouter(prompt, systemPrompt, model, timeout = 15000) {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeout);
            const messages = [];
            if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
            messages.push({ role: 'user', content: prompt });

            const response = await fetch(this._endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this._apiKey,
                    'HTTP-Referer': 'https://qcv.vexonet.online',
                    'X-Title': 'QCV AI'
                },
                body: JSON.stringify({
                    model: model || this._models[0],
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 2000
                }),
                signal: ctrl.signal
            });
            clearTimeout(timer);
            if (!response.ok) {
                const err = await response.text().catch(() => '');
                console.error('[QCV AI] HTTP ' + response.status + ' for model ' + model + ':', err.substring(0, 200));
                throw new Error('HTTP ' + response.status + ': ' + err.substring(0, 100));
            }
            const data = await response.json();
            let text = data.choices?.[0]?.message?.content || '';
            text = text.replace(/```(?:html)?\s*([\s\S]*?)```/g, '$1').trim();
            if (text.length > 3000) text = text.substring(0, 3000);
            console.log('[QCV AI] Success with model:', model);
            return { ok: true, text, provider: 'openrouter-' + (model || this._models[0]) };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    },

    /**
     * Main call — model fallback with caching and retry
     */
    async call(prompt, systemPrompt, opts = {}) {
        const timeout = opts.timeout || 15000;
        const useCache = opts.useCache !== false;
        const maxRetries = opts.maxRetries || 2;

        if (useCache) {
            const cached = this._getCached(prompt);
            if (cached) return cached;
        }

        let lastError = null;

        for (let i = 0; i < this._models.length; i++) {
            for (let retry = 0; retry < maxRetries; retry++) {
                const res = await this._callOpenRouter(prompt, systemPrompt, this._models[i], timeout);
                if (res.ok) {
                    if (useCache) this._setCache(prompt, res);
                    return res;
                }
                lastError = res.error;
                if (retry < maxRetries - 1) {
                    await new Promise(r => setTimeout(r, 1000 * (retry + 1)));
                }
            }
        }

        return { ok: false, error: lastError || 'AI service unavailable' };
    },

    /**
     * Convenience: call with JSON response expectation
     */
    async callJSON(prompt, systemPrompt, opts = {}) {
        const res = await this.call(prompt, systemPrompt, { ...opts, useCache: false });
        if (!res.ok) return res;
        try {
            const parsed = JSON.parse(res.text);
            return { ok: true, text: res.text, json: parsed, provider: res.provider };
        } catch (e) {
            const match = res.text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) {
                try {
                    const parsed = JSON.parse(match[1].trim());
                    return { ok: true, text: res.text, json: parsed, provider: res.provider };
                } catch (e2) { }
            }
            return { ok: false, error: 'Failed to parse JSON response', provider: res.provider };
        }
    },

    async analyzeCV(cvText) {
        const prompt = `Analyze this CV and provide:\n1. Strengths (3-5)\n2. Weaknesses (3-5)\n3. Improvements (5-7)\n4. Score out of 10\n5. ATS friendly? (yes/no with reason)\n\nCV:\n${cvText}\n\nReturn JSON:\n{"strengths":[],"weaknesses":[],"improvements":[],"score":7,"ats_friendly":true,"ats_reason":""}`;
        return this.callJSON(prompt, 'You are an expert CV analyzer.', { timeout: 15000 });
    },

    async matchJob(cvText, jobDescription) {
        const prompt = `Compare this CV to the job description:\n1. Match percentage (0-100)\n2. Matched skills\n3. Missing skills\n4. Recommendations\n\nCV:\n${cvText}\n\nJob:\n${jobDescription}\n\nReturn JSON:\n{"match_percentage":75,"matched_skills":[],"missing_skills":[],"recommendations":[]}`;
        return this.callJSON(prompt, 'You are a job matching expert.', { timeout: 15000 });
    },

    async generateCoverLetter(cvText, jobDescription, companyName) {
        const prompt = `Write a professional cover letter (150-200 words) for ${companyName}.\n\nCV:\n${cvText}\n\nJob:\n${jobDescription}`;
        return this.call(prompt, 'You are a professional cover letter writer. Write in English.', { timeout: 15000 });
    },

    async generateInterviewQuestions(jobTitle, industry) {
        const prompt = `Generate 5 common interview questions for a ${jobTitle} in ${industry}. Include answer tips and examples.`;
        return this.call(prompt, 'You are an interview coach. Write in English.', { timeout: 15000 });
    }
};

window.QCVAI = QCVAI;
