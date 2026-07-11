/**
 * QCV AI Service — Fast unified AI with Pollinations
 */
const QCVAI = {
    /** Pollinations API key (free, no key needed) */
    _pollinationsKey: 'uKxg3L4c6fOoMfM8J0nJ',

    /**
     * Try Pollinations GET (fastest, no key needed)
     */
    async _callPollinations(prompt, systemPrompt, timeout = 12000) {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeout);
            const response = await fetch(
                'https://text.pollinations.ai/' + encodeURIComponent((systemPrompt || '') + '\n\n' + prompt),
                { signal: ctrl.signal }
            );
            clearTimeout(timer);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            let text = await response.text();
            text = text.replace(/```(?:html)?\s*([\s\S]*?)```/g, '$1').trim();
            if (text.length > 3000) text = text.substring(0, 3000);
            return { ok: true, text, provider: 'pollinations' };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    },

    /**
     * Try Pollinations API with API key (may be faster)
     */
    async _callPollinationsKeyed(prompt, systemPrompt, timeout = 12000) {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeout);
            const response = await fetch('https://text.pollinations.ai/openai/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this._pollinationsKey },
                body: JSON.stringify({
                    model: 'openai',
                    messages: [
                        { role: 'system', content: systemPrompt || 'You are a helpful CV writing expert.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1500
                }),
                signal: ctrl.signal
            });
            clearTimeout(timer);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();
            let text = data.choices?.[0]?.message?.content || '';
            text = text.replace(/```(?:html)?\s*([\s\S]*?)```/g, '$1').trim();
            if (text.length > 3000) text = text.substring(0, 3000);
            return { ok: true, text, provider: 'pollinations-keyed' };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    },

    /**
     * Main call — fastest path: Pollinations GET → Pollinations keyed
     * @param {string} prompt - User prompt
     * @param {string|null} systemPrompt - System prompt
     * @param {object} opts - { maxRetries: 1, timeout: 12000 }
     * @returns {Promise<{ok: boolean, text?: string, error?: string, provider?: string}>}
     */
    async call(prompt, systemPrompt, opts = {}) {
        const timeout = opts.timeout || 12000;

        // Try Pollinations GET first (fastest)
        const poll = await this._callPollinations(prompt, systemPrompt, timeout);
        if (poll.ok) return poll;

        // Try Pollinations keyed
        const pollKeyed = await this._callPollinationsKeyed(prompt, systemPrompt, timeout);
        if (pollKeyed.ok) return pollKeyed;

        return { ok: false, error: 'AI service unavailable' };
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

window.QCVAI = QCVAI;
