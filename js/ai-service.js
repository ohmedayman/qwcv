/**
 * QCV AI Service — Unified AI provider with retry, timeout, and fallback
 * Replaces duplicate AI call code across editor.html, index.html, ats-checker.html
 */

const QCVAI = {
    providers: {
        pollinations: {
            name: 'Pollinations',
            url: 'https://text.pollinations.ai/',
            method: 'GET',
            free: true,
            timeout: 25000
        },
        groq: {
            name: 'Groq',
            url: 'https://api.groq.com/openai/v1/chat/completions',
            method: 'POST',
            model: 'llama-3.3-70b-versatile',
            free: true,
            timeout: 20000
        },
        deepseek: {
            name: 'DeepSeek',
            url: 'https://api.deepseek.com/chat/completions',
            method: 'POST',
            model: 'deepseek-chat',
            free: false,
            timeout: 20000
        },
        openrouter: {
            name: 'OpenRouter',
            url: 'https://openrouter.ai/api/v1/chat/completions',
            method: 'POST',
            model: 'meta-llama/llama-3.3-70b-instruct:free',
            free: true,
            timeout: 20000
        },
        openai: {
            name: 'OpenAI',
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'POST',
            model: 'gpt-4o-mini',
            free: false,
            timeout: 20000
        }
    },

    _getKeys() {
        const keys = {};
        try {
            if (window.QCVSettings) {
                keys.groq = window.QCVSettings.groqKey || '';
                keys.deepseek = window.QCVSettings.deepseekKey || '';
                keys.openrouter = window.QCVSettings.openrouterKey || '';
                keys.openai = window.QCVSettings.aiApiKey || '';
            }
        } catch (e) { }
        try {
            if (!keys.groq) keys.groq = localStorage.getItem('qcv_groq_key') || '';
            if (!keys.deepseek) keys.deepseek = localStorage.getItem('qcv_deepseek_key') || '';
            if (!keys.openrouter) keys.openrouter = localStorage.getItem('qcv_openrouter_key') || '';
            if (!keys.openai) keys.openai = localStorage.getItem('qcv_ai_key') || '';
        } catch (e) { }
        return keys;
    },

    _cleanResponse(text) {
        if (!text || typeof text !== 'string') return '';
        text = text.trim();
        // Strip markdown code blocks
        text = text.replace(/^```(?:json|javascript|text|html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        // Strip leading "Here is" / "Here's" preamble
        text = text.replace(/^(Here(?:'s| is| are)[^.]*:\s*\n?)/i, '');
        return text.trim();
    },

    _isHTML(text) {
        return text && text.trim().startsWith('<') && text.trim().length > 200;
    },

    async _callPollinations(prompt, systemPrompt) {
        const fullPrompt = systemPrompt ? systemPrompt + '\n\nUser request:\n' + prompt : prompt;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), this.providers.pollinations.timeout);
        try {
            const res = await fetch(this.providers.pollinations.url + encodeURIComponent(fullPrompt) + '?model=openai&seed=' + Date.now(), {
                method: 'GET',
                signal: ctrl.signal
            });
            clearTimeout(timer);
            if (!res.ok) throw new Error('Pollinations HTTP ' + res.status);
            const text = await res.text();
            if (!text || text.length < 5 || this._isHTML(text)) throw new Error('Pollinations returned invalid content');
            return { ok: true, text: this._cleanResponse(text), provider: 'pollinations' };
        } catch (e) {
            clearTimeout(timer);
            return { ok: false, error: e.message || 'Pollinations failed', provider: 'pollinations' };
        }
    },

    async _callOpenAICompatible(provider, prompt, systemPrompt, apiKey) {
        if (!apiKey) return { ok: false, error: 'No API key for ' + provider, provider };
        const cfg = this.providers[provider];
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), cfg.timeout);
        try {
            const res = await fetch(cfg.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({ model: cfg.model, messages, max_tokens: 2000, temperature: 0.7 }),
                signal: ctrl.signal
            });
            clearTimeout(timer);
            if (!res.ok) throw new Error(provider + ' HTTP ' + res.status);
            const json = await res.json();
            const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
            if (!text) throw new Error(provider + ' returned empty');
            return { ok: true, text: this._cleanResponse(text), provider };
        } catch (e) {
            clearTimeout(timer);
            return { ok: false, error: e.message || provider + ' failed', provider };
        }
    },

    /**
     * Main entry: call AI with prompt and system prompt
     * Tries Pollinations first, then falls back to user-configured paid providers
     * @param {string} prompt - The user prompt
     * @param {string} [systemPrompt] - Optional system prompt
     * @param {object} [opts] - Options: { maxRetries, providers[], jsonResponse }
     * @returns {Promise<{ok: boolean, text?: string, error?: string, provider?: string}>}
     */
    async call(prompt, systemPrompt, opts = {}) {
        const keys = this._getKeys();
        const maxRetries = opts.maxRetries || 1;

        // Always try Pollinations first (free, no key needed)
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const res = await this._callPollinations(prompt, systemPrompt);
            if (res.ok) return res;
            if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1500));
        }

        // Fallback chain: try each provider with a key
        const fallbackOrder = ['groq', 'deepseek', 'openrouter', 'openai'];
        for (const prov of fallbackOrder) {
            if (keys[prov]) {
                const res = await this._callOpenAICompatible(prov, prompt, systemPrompt, keys[prov]);
                if (res.ok) return res;
            }
        }

        return { ok: false, error: 'All AI providers failed' };
    },

    /**
     * Convenience: call with JSON response expectation
     */
    async callJSON(prompt, systemPrompt, opts = {}) {
        const res = await this.call(prompt, systemPrompt, opts);
        if (!res.ok) return res;
        try {
            const parsed = JSON.parse(res.text);
            return { ok: true, text: res.text, json: parsed, provider: res.provider };
        } catch (e) {
            // Try to extract JSON from markdown code block
            const match = res.text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) {
                try {
                    const parsed = JSON.parse(match[1].trim());
                    return { ok: true, text: res.text, json: parsed, provider: res.provider };
                } catch (e2) { }
            }
            return { ok: false, error: 'Failed to parse JSON response', provider: res.provider };
        }
    }
};

// Expose globally
window.QCVAI = QCVAI;
