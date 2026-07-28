/**
 * QCV AI Service — OpenRouter API
 * Unified AI with caching, retry, model fallback, and streaming
 */
const QCVAI = {
    _apiKey: (window.QCVConfig && window.QCVConfig.openrouterKey) || '',
    _endpoint: (window.QCVConfig && window.QCVConfig.openrouterEndpoint) || 'https://openrouter.ai/api/v1/chat/completions',
    _models: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini', 'openai/gpt-4.1-nano'],
    _cache: new Map(),
    _cacheExpiry: 5 * 60 * 1000,
    _usageLog: [],

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

    _logUsage(model, feature, tokens) {
        this._usageLog.push({ model, feature, tokens, time: Date.now() });
        if (this._usageLog.length > 500) this._usageLog = this._usageLog.slice(-250);
    },

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
                console.error('[QCV AI] HTTP ' + response.status + ' for ' + model + ':', err.substring(0, 200));
                throw new Error('HTTP ' + response.status);
            }
            const data = await response.json();
            let text = data.choices?.[0]?.message?.content || '';
            text = text.replace(/```(?:html)?\s*([\s\S]*?)```/g, '$1').trim();
            if (text.length > 3000) text = text.substring(0, 3000);
            this._logUsage(model, 'call', data.usage?.total_tokens || 0);
            return { ok: true, text, provider: 'openrouter-' + (model || this._models[0]) };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    },

    /**
     * Streaming call — yields tokens as they arrive via SSE
     * Returns { ok, reader, cancel() } on success
     */
    async callStream(prompt, systemPrompt, opts = {}) {
        const model = opts.model || this._models[0];
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });

        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), opts.timeout || 30000);

            const response = await fetch(this._endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this._apiKey,
                    'HTTP-Referer': 'https://qcv.vexonet.online',
                    'X-Title': 'QCV AI'
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: opts.maxTokens || 2500,
                    stream: true
                }),
                signal: ctrl.signal
            });
            clearTimeout(timer);

            if (!response.ok) {
                const err = await response.text().catch(() => '');
                throw new Error('HTTP ' + response.status);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';

            return {
                ok: true,
                provider: 'openrouter-' + model,
                cancel: () => { ctrl.abort(); reader.cancel().catch(() => {}); },
                async *[Symbol.asyncIterator]() {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';
                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed || !trimmed.startsWith('data:')) continue;
                                const payload = trimmed.slice(5).trim();
                                if (payload === '[DONE]') return;
                                try {
                                    const json = JSON.parse(payload);
                                    const delta = json.choices?.[0]?.delta?.content;
                                    if (delta) {
                                        fullText += delta;
                                        yield { token: delta, text: fullText };
                                    }
                                } catch (e) { /* skip malformed lines */ }
                            }
                        }
                    } finally {
                        let cleaned = fullText.replace(/```(?:html)?\s*([\s\S]*?)```/g, '$1').trim();
                        if (cleaned.length > 3000) cleaned = cleaned.substring(0, 3000);
                    }
                },
                getFullText() {
                    let cleaned = fullText.replace(/```(?:html)?\s*([\s\S]*?)```/g, '$1').trim();
                    if (cleaned.length > 3000) cleaned = cleaned.substring(0, 3000);
                    return cleaned;
                }
            };
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
            return { ok: false, error: 'Failed to parse JSON', provider: res.provider };
        }
    },

    async analyzeCV(cvText) {
        const prompt = `Analyze this CV:\n1. Strengths (3-5)\n2. Weaknesses (3-5)\n3. Score (0-10)\n4. ATS friendly?\n\nCV:\n${cvText}\n\nJSON: {"strengths":[],"weaknesses":[],"score":7,"ats_friendly":true}`;
        return this.callJSON(prompt, 'Expert CV analyzer.', { timeout: 15000 });
    },

    async matchJob(cvText, jobDescription) {
        const prompt = `Match CV to job:\nCV:\n${cvText}\n\nJob:\n${jobDescription}\n\nJSON: {"match_percentage":75,"matched":[],"missing":[],"recommendations":[]}`;
        return this.callJSON(prompt, 'Job matching expert.', { timeout: 15000 });
    },

    async generateCoverLetter(cvText, jobDescription, company) {
        return this.call(`Write a cover letter (150-200 words) for ${company}.\nCV:\n${cvText}\nJob:\n${jobDescription}`, 'Professional cover letter writer. English.', { timeout: 15000 });
    },

    async generateInterviewQuestions(jobTitle, industry) {
        return this.call(`5 interview questions for ${jobTitle} in ${industry} with answer tips.`, 'Interview coach. English.', { timeout: 15000 });
    },

    async generateEmailSignature(name, title, company, phone, email) {
        return this.call(`Create a professional email signature for:\nName: ${name}\nTitle: ${title}\nCompany: ${company}\nPhone: ${phone}\nEmail: ${email}\n\nProvide 3 different styles (Minimal, Professional, Creative). Each should be clean HTML.`, 'Email signature designer. Output only HTML.', { timeout: 15000 });
    },

    async optimizeSkills(cvText, targetJob) {
        return this.call(`Optimize this CV's skills section for: ${targetJob || 'general'}\n\nCV:\n${cvText}\n\nProvide:\n1. Top 10 technical skills to highlight\n2. Top 5 soft skills\n3. Skills to remove or reword\n4. Keywords for ATS`, 'Skills optimization expert. English.', { timeout: 15000 });
    },

    getUsageStats() {
        const now = Date.now();
        const today = this._usageLog.filter(u => now - u.time < 86400000);
        return {
            total: this._usageLog.length,
            today: today.length,
            byModel: today.reduce((acc, u) => { acc[u.model] = (acc[u.model] || 0) + 1; return acc; }, {}),
            cacheSize: this._cache.size
        };
    }
};

window.QCVAI = QCVAI;
