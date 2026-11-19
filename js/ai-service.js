/**
 * QCV AI Client Service — Enterprise OpenAI Integration
 * 
 * Communicates exclusively with the secure server-side endpoint (/api/ai).
 * NEVER includes, stores, or requests API keys on the client.
 * Features:
 * - Firebase Auth Bearer token verification
 * - Responds in the resume's active language (Arabic or English)
 * - Clean outputs with zero conversational filler ready for 1-click "Apply"
 * - 5-minute client-side caching
 * - Clear, user-friendly error alerts (Plan upgrade, Rate limits, Auth)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QCVAI = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  const clientCache = new Map();

  function hashKey(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return h.toString(36);
  }

  function detectLanguage(text) {
    if (!text) return 'ar';
    const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
    return rtlRegex.test(text) ? 'ar' : 'en';
  }

  async function getAuthToken() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        return await firebase.auth().currentUser.getIdToken(true);
      }
      if (window._firebaseAuth && window._firebaseAuth.currentUser) {
        return await window._firebaseAuth.currentUser.getIdToken(true);
      }
    } catch (e) {
      console.warn('[QCV AI] Error retrieving auth token:', e.message);
    }
    return null;
  }

  function notifyUser(message, type = 'error') {
    if (window.QCVNotify && typeof window.QCVNotify[type] === 'function') {
      window.QCVNotify[type](message);
    } else {
      console.warn(`[QCV AI ${type}]`, message);
      if (type === 'error' && typeof alert === 'function') {
        alert(message);
      }
    }
  }

  function triggerUpgradeModal(reason) {
    const modal = document.getElementById('upgradeModal') || document.getElementById('pricingModal');
    if (modal) {
      modal.style.display = 'flex';
      const reasonEl = document.getElementById('upgradeReason');
      if (reasonEl) reasonEl.textContent = reason;
    } else {
      notifyUser(reason || 'هذه الميزة متاحة لمشتركي باقات Pro و Unlimited فقط. يرجى الترقية للمتابعة.');
    }
  }

  async function executeRequest({ task, prompt, systemPrompt = '', language = 'ar', modelOverride = null }) {
    // 1. Language normalization
    const lang = language === 'en' ? 'en' : 'ar';

    // 2. Client-side Cache lookup
    const cacheId = `${task}_${lang}_${hashKey(prompt)}`;
    const cached = clientCache.get(cacheId);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
      return { ok: true, text: cached.text, cached: true, model: cached.model };
    }

    // 3. Retrieve Auth ID Token
    const idToken = await getAuthToken();
    if (!idToken) {
      const err = lang === 'ar'
        ? 'يرجى تسجيل الدخول أولاً لاستخدام ميزات الذكاء الاصطناعي.'
        : 'Please sign in to use QCV AI features.';
      notifyUser(err, 'warning');
      return { ok: false, error: err, code: 'AUTH_REQUIRED' };
    }

    // 4. Send request to server endpoint
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          task,
          prompt,
          systemPrompt,
          language: lang,
          modelOverride
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        const errorCode = data.code || 'UNKNOWN_ERROR';
        const errorMsg = data.error || (lang === 'ar' ? 'تعذر الاتصال بمزود الذكاء الاصطناعي.' : 'AI request failed.');

        if (errorCode === 'UPGRADE_REQUIRED' || errorCode === 'PRO_REQUIRED') {
          triggerUpgradeModal(errorMsg);
        } else {
          notifyUser(errorMsg, 'error');
        }

        return { ok: false, error: errorMsg, code: errorCode };
      }

      // Store in client-side cache
      clientCache.set(cacheId, {
        text: data.text,
        model: data.model,
        timestamp: Date.now()
      });

      return {
        ok: true,
        text: data.text,
        model: data.model,
        cached: false,
        tokenCount: data.tokenCount || 0
      };
    } catch (netErr) {
      const netError = lang === 'ar'
        ? 'حدث خطأ في شبكة الاتصال بخادم الذكاء الاصطناعي. يرجى التحقق من اتصالك.'
        : 'Network connection error with the AI server. Please check your connection.';
      notifyUser(netError, 'error');
      return { ok: false, error: netError, code: 'NETWORK_ERROR' };
    }
  }

  const QCVAI = {
    detectLanguage,

    /**
     * 1. Professional Summary (50-100 words, action-oriented, zero filler)
     */
    async generateSummary(cvData, langOverride) {
      const lang = langOverride || (detectLanguage(cvData.name + ' ' + (cvData.title || '')) === 'ar' ? 'ar' : 'en');
      const experiences = (cvData.experience || [])
        .map(e => `${e.role || ''} at ${e.company || ''}: ${e.description || ''}`)
        .join('\n');
      const skills = Array.isArray(cvData.skills) ? cvData.skills.join(', ') : '';

      const prompt = lang === 'ar'
        ? `المسمى الوظيفي: ${cvData.title || 'غير محدد'}\nالخبرات:\n${experiences || 'مبتدئ'}\nالمهارات: ${skills}\n\nاكتب ملخصاً مهنياً قوياً وموجزاً (بين 50 إلى 100 كلمة) يبرز القيمة المهنية ونقاط القوة، دون أي عبارات ترحيب أو مقدمات.`
        : `Job Title: ${cvData.title || 'Professional'}\nExperience:\n${experiences || 'Entry Level'}\nSkills: ${skills}\n\nWrite a compelling, concise professional resume summary (50-100 words) highlighting impact and strengths. Output ONLY the summary text.`;

      return executeRequest({
        task: 'summary',
        prompt,
        language: lang
      });
    },

    /**
     * 2. Proofreading (Grammar, spelling, professional vocabulary)
     */
    async proofread(text, langOverride) {
      if (!text || !text.trim()) return { ok: false, error: 'النص فارغ' };
      const lang = langOverride || detectLanguage(text);

      const prompt = lang === 'ar'
        ? `قم بالتدقيق اللغوي والإملائي والتحسين الصياغي للنص التالي مع الحفاظ الكامل على المعنى المهني، وأخرج النص المصحح فقط بدون أي تعليقات:\n\n${text}`
        : `Proofread and polish the following resume text for grammar, punctuation, and professional phrasing. Return ONLY the corrected text:\n\n${text}`;

      return executeRequest({
        task: 'proofread',
        prompt,
        language: lang
      });
    },

    /**
     * 3. Content Enhancer (Convert descriptions into strong action-verb bullet points)
     */
    async enhanceContent(text, langOverride) {
      if (!text || !text.trim()) return { ok: false, error: 'النص فارغ' };
      const lang = langOverride || detectLanguage(text);

      const prompt = lang === 'ar'
        ? `أعد صياغة الخبرات والمهام التالية بأسلوب إنجازات احترافي يبدأ بأفعال قوية، ويستخدم صياغة نتائج قابلة للقياس إن أمكن. كل إنجاز في نقطة تبدأ بعلامة (-). أخرج النقاط فقط:\n\n${text}`
        : `Rewrite the following job responsibilities into high-impact, results-oriented bullet points starting with strong action verbs. Each bullet must start with (-). Return ONLY the bullet points:\n\n${text}`;

      return executeRequest({
        task: 'enhance',
        prompt,
        language: lang
      });
    },

    /**
     * 4. Suggest 12 Skills (60% Technical / 40% Soft)
     */
    async suggestSkills(jobTitle, experienceSummary, langOverride) {
      const lang = langOverride || detectLanguage(jobTitle + ' ' + (experienceSummary || ''));

      const prompt = lang === 'ar'
        ? `المسمى الوظيفي: ${jobTitle}\nنبذة عن الخبرة: ${experienceSummary || ''}\n\nاقترح قائمة من 12 مهارة مطلوبة ومهمة لسوق العمل (7 أو 8 مهارات تقنية وفنية + 4 أو 5 مهارات شخصية وإدارية).\nأخرج النتيجة كقائمة نقية سطر بسطر فقط (اسم المهارة في كل سطر دون ترقيم أو علامات).`
        : `Job Title: ${jobTitle}\nExperience Context: ${experienceSummary || ''}\n\nSuggest exactly 12 relevant in-demand skills (7-8 technical/hard skills and 4-5 soft/interpersonal skills).\nReturn ONLY a plain list with one skill per line, without numbering or bullets.`;

      const res = await executeRequest({
        task: 'skills',
        prompt,
        language: lang
      });

      if (res.ok && res.text) {
        const skillsArray = res.text
          .split('\n')
          .map(s => s.replace(/^[-*•\d.)\s]+/, '').trim())
          .filter(Boolean);
        return { ...res, skills: skillsArray };
      }
      return res;
    },

    /**
     * 5. Optimize for ATS
     */
    async improveForATS(cvData, langOverride) {
      const lang = langOverride || (detectLanguage(cvData.name + ' ' + (cvData.title || '')) === 'ar' ? 'ar' : 'en');
      const text = [
        cvData.title,
        cvData.summary,
        (cvData.skills || []).join(', '),
        (cvData.experience || []).map(e => e.role + ' ' + e.description).join('\n')
      ].join('\n\n');

      const prompt = lang === 'ar'
        ? `حلل محتوى السيرة الذاتية التالي وأعد صياغته ليتوافق مع أنظمة الفرز الآلي (ATS)، مع التركيز على تضمين الكلمات المفتاحية المهنية والمعيارية للمجال. أخرج النص المحسن مباشرة:\n\n${text}`
        : `Optimize the following resume text for Applicant Tracking Systems (ATS) by infusing industry-standard keywords and clear phrasing. Return ONLY the optimized text:\n\n${text}`;

      return executeRequest({
        task: 'ats',
        prompt,
        language: lang
      });
    },

    /**
     * 6. Translate CV (Arabic <-> English)
     */
    async translateCV(text, targetLang = 'en') {
      const prompt = targetLang === 'en'
        ? `Translate the following professional resume content into fluent, industry-standard English. Maintain professional corporate terminology. Return ONLY the translated text:\n\n${text}`
        : `ترجم محتوى السيرة الذاتية التالي إلى لغة عربية مهنية وفصيحة مع الحفاظ على المصطلحات التقنية المعيارية. أخرج النص المترجم فقط:\n\n${text}`;

      return executeRequest({
        task: 'translate',
        prompt,
        language: targetLang
      });
    },

    /**
     * 7. Cover Letter (3-4 paragraphs, max 300 words, zero cliché intros)
     */
    async generateCoverLetter(cvData, jobDescription, langOverride) {
      const lang = langOverride || detectLanguage(jobDescription || cvData.title || '');

      const prompt = lang === 'ar'
        ? `بيانات المتقدم:\nالاسم: ${cvData.name}\nالمسمى: ${cvData.title}\nالخبرات: ${(cvData.experience || []).map(e => e.role + ' في ' + e.company).join(', ')}\nالمهارات: ${(cvData.skills || []).slice(0, 8).join(', ')}\n\nالوصف الوظيفي المستهدف:\n${jobDescription || 'وظيفة مناسبة للخبرات'}\n\nاكتب خطاب تعريف (Cover Letter) مخصصاً ومحترفاً يتكون من 3 إلى 4 فقرات وبحد أقصى 300 كلمة. تجنب المقدمات الروتينية والمبتذلة. أخرج نص الخطاب فقط.`
        : `Candidate Profile:\nName: ${cvData.name}\nTitle: ${cvData.title}\nKey Experience: ${(cvData.experience || []).map(e => e.role + ' at ' + e.company).join(', ')}\nSkills: ${(cvData.skills || []).slice(0, 8).join(', ')}\n\nTarget Job Description:\n${jobDescription || 'Relevant Role'}\n\nWrite a tailored, high-converting cover letter consisting of 3 to 4 paragraphs, strictly under 300 words. Avoid cliché opening phrases. Return ONLY the letter text.`;

      return executeRequest({
        task: 'cover_letter',
        prompt,
        language: lang
      });
    },

    /**
     * 8. Ask AI (Free Career & Resume Advice)
     */
    async askAI(question, cvData, langOverride) {
      const lang = langOverride || detectLanguage(question);
      const cvContext = `المسمى: ${cvData.title || ''}\nالملخص: ${cvData.summary || ''}\nالمهارات: ${(cvData.skills || []).slice(0, 10).join(', ')}`;

      const prompt = lang === 'ar'
        ? `سياق السيرة الذاتية للمستخدم:\n${cvContext}\n\nسؤال المستخدم:\n${question}\n\nأجب بإيجاز واحترافية وبشكل عملي ومباشر.`
        : `User Resume Context:\n${cvContext}\n\nUser Question:\n${question}\n\nAnswer concisely, professionally, and practically.`;

      return executeRequest({
        task: 'ask_ai',
        prompt,
        language: lang
      });
    },

    /**
     * 9. (PRO) Job Tailoring
     */
    async tailorForJob(cvData, jobDescription, langOverride) {
      const lang = langOverride || detectLanguage(jobDescription);
      const text = JSON.stringify({
        title: cvData.title,
        summary: cvData.summary,
        skills: cvData.skills,
        experience: cvData.experience
      });

      const prompt = lang === 'ar'
        ? `الوصف الوظيفي المستهدف:\n${jobDescription}\n\nالسيرة الذاتية الحالية:\n${text}\n\nقم بتخصيص السيرة الذاتية وتعديل المسمى والملخص ونقاط الخبرات لتتطابق بدقة مع متطلبات هذه الوظيفة. أخرج النص المخصص والجاهز للتطبيق فقط.`
        : `Target Job Description:\n${jobDescription}\n\nCurrent Resume:\n${text}\n\nTailor the title, summary, and experience bullet points specifically to match this target job requirements. Return ONLY the tailored content.`;

      return executeRequest({
        task: 'job_tailor',
        prompt,
        language: lang
      });
    },

    /**
     * 10. (PRO) Skills Gap Analysis
     */
    async skillsGapAnalysis(cvData, jobDescription, langOverride) {
      const lang = langOverride || detectLanguage(jobDescription);
      const candidateSkills = (cvData.skills || []).join(', ');

      const prompt = lang === 'ar'
        ? `مهارات المتقدم الحالية: ${candidateSkills}\n\nالوصف الوظيفي:\n${jobDescription}\n\nقدم تحليلاً دقيقاً لفجوة المهارات في 3 أقسام واضحة:\n1. المهارات المتطابقة\n2. المهارات المفقودة أو المطلوبة بإلحاح\n3. نصيحة عملية لسد الفجوة.`
        : `Candidate Skills: ${candidateSkills}\n\nJob Description:\n${jobDescription}\n\nProvide a precise skills gap analysis in 3 clear sections:\n1. Matching Skills\n2. Missing / High-Priority Skills\n3. Actionable Advice to Bridge the Gap.`;

      return executeRequest({
        task: 'skills_gap',
        prompt,
        language: lang
      });
    },

    /**
     * 11. (PRO) Interview Preparation
     */
    async interviewPrep(cvData, jobDescription, langOverride) {
      const lang = langOverride || detectLanguage(jobDescription || cvData.title || '');

      const prompt = lang === 'ar'
        ? `المسمى والخبرة: ${cvData.title}\nالوصف الوظيفي: ${jobDescription || 'عام'}\n\nاقترح أهم 5 أسئلة مقابلة عمل متوقعة لهذه الوظيفة بدقة، مع نقاط إجابة استراتيجية لكل سؤال ترتكز على خبرات المتقدم.`
        : `Role & Background: ${cvData.title}\nJob Description: ${jobDescription || 'General'}\n\nProvide the top 5 anticipated interview questions for this specific role, accompanied by strategic talking points based on the candidate's background.`;

      return executeRequest({
        task: 'interview_prep',
        prompt,
        language: lang
      });
    },

    /**
     * Compatibility Methods for Legacy Pages (ats-checker, compare, ai-tools, editor)
     */
    async call(prompt, systemPrompt, opts = {}) {
      const lang = opts.language || detectLanguage(prompt);
      return executeRequest({
        task: opts.task || 'general',
        prompt,
        systemPrompt: systemPrompt || opts.systemPrompt || '',
        language: lang,
        modelOverride: opts.model || null
      });
    },

    async callJSON(prompt, systemPrompt, opts = {}) {
      const jsonSystem = (systemPrompt ? systemPrompt + '\n\n' : '') +
        'Respond ONLY with a valid, raw JSON object. Do not wrap in markdown or backticks.';
      const res = await this.call(prompt, jsonSystem, opts);
      if (!res.ok) return res;
      try {
        let clean = (res.text || '').replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/g, '$1').trim();
        const parsed = JSON.parse(clean);
        return { ok: true, data: parsed, text: clean, model: res.model };
      } catch (e) {
        return { ok: false, error: 'Failed to parse JSON: ' + e.message, rawText: res.text };
      }
    },

    async analyzeCV(cvText) {
      const lang = detectLanguage(cvText);
      const prompt = lang === 'ar'
        ? `حلل السيرة الذاتية التالية تحليلاً دقيقاً شاملاً لنقاط القوة والضعف وفرص التحسين والتوافق مع ATS:\n\n${cvText}`
        : `Analyze the following resume comprehensively for strengths, weaknesses, and ATS optimization opportunities:\n\n${cvText}`;
      return this.call(prompt, null, { task: 'ats', language: lang });
    },

    async matchJob(cvText, jobDesc) {
      const lang = detectLanguage(jobDesc || cvText);
      const prompt = lang === 'ar'
        ? `قارن السيرة الذاتية التالية بالوصف الوظيفي المحدد، واستخرج نسبة التوافق، والكلمات المفتاحية المتطابقة، والكلمات الناقصة:\n\nالوصف الوظيفي:\n${jobDesc}\n\nالسيرة الذاتية:\n${cvText}`
        : `Compare this resume against the target job description. Identify match percentage, matched keywords, and missing critical skills:\n\nJob Description:\n${jobDesc}\n\nResume:\n${cvText}`;
      return this.call(prompt, null, { task: 'job_tailor', language: lang });
    },

    getUsageStats() {
      return { cacheSize: clientCache.size };
    }
  };

  return QCVAI;
});
