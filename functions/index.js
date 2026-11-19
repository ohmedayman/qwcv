const { onValueWritten } = require("firebase-functions/v2/database");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// In-memory 5-minute cache and rate-limit tracking
const aiCache = new Map();
const rateLimitMap = new Map();

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

function calculateCost(model, inTokens, outTokens) {
  let inRate = 0.15 / 1000000;
  let outRate = 0.60 / 1000000;
  if (model.includes("gpt-4o") && !model.includes("mini")) {
    inRate = 2.50 / 1000000;
    outRate = 10.00 / 1000000;
  } else if (model.includes("4.1-mini")) {
    inRate = 0.20 / 1000000;
    outRate = 0.80 / 1000000;
  }
  return Number(((inTokens * inRate) + (outTokens * outRate)).toFixed(6));
}

async function callOpenAI({ apiKey, model, messages, maxTokens = 1500, temperature = 0.5, timeoutMs = 15000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      }),
      signal: ctrl.signal
    });

    clearTimeout(timer);

    const data = await res.json();
    if (!res.ok) {
      const errMsg = data?.error?.message || `OpenAI returned HTTP ${res.status}`;
      const err = new Error(errMsg);
      err.status = res.status;
      err.code = data?.error?.code;
      throw err;
    }

    const text = data?.choices?.[0]?.message?.content || "";
    const usage = data?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    return { ok: true, text, usage, model };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

exports.deleteAuthUser = onValueWritten(
  {
    ref: "/users/{uid}",
  },
  async (event) => {
    const uid = event.params.uid;
    const before = event.data.before.val();
    const after = event.data.after.val();

    if (before !== null && after === null) {
      try {
        await admin.auth().deleteUser(uid);
        console.log("Deleted auth user:", uid);
      } catch (err) {
        console.error("Failed to delete auth user:", uid, err.message);
      }
    }
  }
);

// Admin-only: grant or revoke the "admin"/"staff" custom claims used by the admin panel and DB rules.
exports.setUserClaims = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const header = req.get("Authorization") || "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ ok: false, error: "Missing token" });
  }

  let caller;
  try {
    caller = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
  if (caller.admin !== true) {
    return res.status(403).json({ ok: false, error: "Admins only" });
  }

  const { email, role } = req.body || {};
  const claimsByRole = { admin: { admin: true }, staff: { staff: true }, none: {} };
  if (typeof email !== "string" || !email.includes("@") || !Object.prototype.hasOwnProperty.call(claimsByRole, role)) {
    return res.status(400).json({ ok: false, error: "Expected { email, role: admin | staff | none }" });
  }
  if (email.toLowerCase() === String(caller.email || "").toLowerCase() && role !== "admin") {
    return res.status(400).json({ ok: false, error: "You cannot remove your own admin access" });
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, claimsByRole[role]);
    return res.json({ ok: true, uid: user.uid, role });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message || "User not found" });
  }
});

/**
 * Unified Secure OpenAI Cloud Function Endpoint
 */
exports.openaiProxy = onRequest(
  { cors: true, secrets: [openaiApiKey] },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
    }

    // 1. Authenticate user via Firebase Auth ID Token
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "يرجى تسجيل الدخول أولاً للوصول إلى ميزات الذكاء الاصطناعي.",
        code: "AUTH_REQUIRED"
      });
    }

    const idToken = authHeader.split("Bearer ")[1].trim();
    let uid;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (authErr) {
      return res.status(401).json({
        ok: false,
        error: "جلسة المستخدم منتهية أو غير صالحة. يرجى إعادة تسجيل الدخول.",
        code: "AUTH_INVALID"
      });
    }

    // 2. Validate User Plan & Subscription Status
    let userData = {};
    try {
      const snap = await admin.database().ref(`users/${uid}`).once("value");
      userData = snap.val() || {};
    } catch (dbErr) {
      console.warn("Could not read user plan from DB:", dbErr.message);
    }

    const plan = userData.plan || (userData.subscription && userData.subscription.plan) || "free";
    const expiresAt = userData.planExpiresAt || (userData.subscription && userData.subscription.expiresAt) || 0;
    const isExpired = expiresAt > 0 && Date.now() > expiresAt;
    const effectivePlan = isExpired ? "free" : plan;

    if (effectivePlan === "free") {
      return res.status(403).json({
        ok: false,
        error: "ميزات الذكاء الاصطناعي مخصصة للمشتركين فقط (باقات Pro أو Unlimited). يرجى الترقية للمتابعة.",
        code: "UPGRADE_REQUIRED"
      });
    }

    const { prompt, systemPrompt, task = "general", language = "ar", modelOverride } = req.body || {};

    const PRO_ONLY_TASKS = ["job_tailor", "skills_gap", "interview_prep"];
    if (PRO_ONLY_TASKS.includes(task) && effectivePlan !== "pro" && effectivePlan !== "unlimited" && effectivePlan !== "pass_48h") {
      return res.status(403).json({
        ok: false,
        error: "هذه الميزة المتقدمة متاحة حصرياً لمشتركي باقة Pro أو Unlimited.",
        code: "PRO_REQUIRED"
      });
    }

    // 3. User-Level Rate Limiting (max 20 calls/minute)
    const now = Date.now();
    const userTimestamps = rateLimitMap.get(uid) || [];
    const recentCalls = userTimestamps.filter((t) => now - t < 60000);
    if (recentCalls.length >= 20) {
      return res.status(429).json({
        ok: false,
        error: "تجاوزت الحد المسموح للطلبات السريعة (20 طلب/دقيقة). يرجى الانتظار لحظات والمحاولة مجدداً.",
        code: "RATE_LIMITED"
      });
    }
    recentCalls.push(now);
    rateLimitMap.set(uid, recentCalls);

    // 4. Validate Prompt & Inputs
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ ok: false, error: "نص الطلب فارغ أو غير صالح.", code: "EMPTY_PROMPT" });
    }
    if (prompt.length > 10000) {
      return res.status(400).json({
        ok: false,
        error: "النص المدخل طويل جداً (الحد الأقصى المسموح به 10,000 حرف).",
        code: "INPUT_TOO_LONG"
      });
    }

    // 5. Check 5-Minute Cache
    const cacheKey = `${uid}_${task}_${language}_${hashString(prompt)}`;
    const cachedItem = aiCache.get(cacheKey);
    if (cachedItem && now - cachedItem.timestamp < 300000) {
      return res.json({
        ok: true,
        text: cachedItem.text,
        model: cachedItem.model,
        cached: true,
        tokenCount: cachedItem.tokenCount
      });
    }

    // 6. Retrieve Server Key (Environment or Secret)
    let apiKey = "";
    try {
      apiKey = openaiApiKey.value();
    } catch (_) {}
    if (!apiKey) {
      apiKey = process.env.OPENAI_API_KEY || "";
    }
    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "مفتاح OpenAI غير مهيأ على السيرفر (OPENAI_API_KEY is not configured).",
        code: "SERVER_CONFIG_ERROR"
      });
    }

    // 7. Select Models (Configurable)
    const FAST_TASKS = ["summary", "proofread", "enhance", "skills", "ats", "translate"];
    const DEEP_TASKS = ["cover_letter", "job_tailor", "skills_gap", "interview_prep", "ask_ai"];

    const FAST_MODEL = process.env.OPENAI_FAST_MODEL || "gpt-4o-mini";
    const DEEP_MODEL = process.env.OPENAI_DEEP_MODEL || "gpt-4o";
    const FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || "gpt-4.1-mini";

    let primaryModel = FAST_TASKS.includes(task) ? FAST_MODEL : DEEP_MODEL;
    if (modelOverride) primaryModel = modelOverride;

    const maxTokens = DEEP_TASKS.includes(task) ? 2500 : 1200;

    // 8. Prepare Bilingual System Prompt with Clean Output Mandate
    let baseSystemPrompt = "";
    if (language === "ar") {
      baseSystemPrompt =
        "أنت مساعد QCV الذكي لكتابة وتطوير السير الذاتية باللغة العربية. يجب أن تكون إجاباتك باللغة العربية الفصحى المهنية والسليمة 100%. أخرج المحتوى المطلوب فقط بشكل مباشر ونظيف جداً بدون أي مقدمات (مثل 'إليك الملخص' أو 'بالتأكيد') وبدون خاتمات أو أسئلة متابعة، حتى يتمكن المستخدم من تطبيق النص مباشرة على سيرته الذاتية.";
    } else {
      baseSystemPrompt =
        "You are the QCV AI Resume Assistant. All outputs must be in fluent, professional English. Output ONLY the required clean text directly without any conversational preamble, greetings, introductions, or conclusions, so it can be applied directly to the resume.";
    }

    const messages = [
      { role: "system", content: systemPrompt ? `${baseSystemPrompt}\n\n${systemPrompt}` : baseSystemPrompt },
      { role: "user", content: prompt }
    ];

    // 9. Execute with 15s Timeout & Automatic Fallback to gpt-4.1-mini (1 retry)
    let responseResult = null;
    let usedModel = primaryModel;

    try {
      responseResult = await callOpenAI({
        apiKey,
        model: primaryModel,
        messages,
        maxTokens,
        temperature: 0.5,
        timeoutMs: 15000
      });
    } catch (primaryErr) {
      console.warn(`[QCV AI] Primary model ${primaryModel} failed (${primaryErr.message}). Retrying with fallback ${FALLBACK_MODEL}...`);
      usedModel = FALLBACK_MODEL;
      try {
        await new Promise((r) => setTimeout(r, 1000));
        responseResult = await callOpenAI({
          apiKey,
          model: FALLBACK_MODEL,
          messages,
          maxTokens,
          temperature: 0.5,
          timeoutMs: 15000
        });
      } catch (fallbackErr) {
        console.error(`[QCV AI] Fallback model ${FALLBACK_MODEL} failed:`, fallbackErr);
        let userMessage = "تعذر الاتصال بخدمة الذكاء الاصطناعي حالياً. يرجى المحاولة بعد لحظات.";
        let errCode = "AI_REQUEST_FAILED";

        if (fallbackErr.status === 429) {
          userMessage = "خدمة الذكاء الاصطناعي مشغولة حالياً (تم تجاوز حد معدل الطلبات). يرجى الانتظار قليلاً.";
          errCode = "OPENAI_RATE_LIMIT";
        } else if (fallbackErr.status === 401) {
          userMessage = "خطأ في تكوين مزود الذكاء الاصطناعي (مفتاح API غير صالح).";
          errCode = "OPENAI_AUTH_ERROR";
        } else if (fallbackErr.name === "AbortError") {
          userMessage = "استغرق خادم الذكاء الاصطناعي وقتاً أطول من المتوقع (أكثر من 15 ثانية). يرجى المحاولة مجدداً.";
          errCode = "TIMEOUT";
        }

        return res.status(502).json({ ok: false, error: userMessage, code: errCode, details: fallbackErr.message });
      }
    }

    // 10. Post-process clean text
    let cleanText = (responseResult.text || "").trim();
    cleanText = cleanText.replace(/^```(?:markdown|text|json)?\s*([\s\S]*?)\s*```$/g, "$1").trim();

    // 11. Cache identical results for 5 minutes
    aiCache.set(cacheKey, {
      text: cleanText,
      model: usedModel,
      tokenCount: responseResult.usage.total_tokens || 0,
      timestamp: now
    });

    // 12. Log Usage and Cost asynchronously to Realtime Database
    try {
      const cost = calculateCost(usedModel, responseResult.usage.prompt_tokens, responseResult.usage.completion_tokens);
      const usageRef = admin.database().ref(`users/${uid}/aiUsage`).push();
      usageRef.set({
        task,
        model: usedModel,
        language,
        promptTokens: responseResult.usage.prompt_tokens,
        completionTokens: responseResult.usage.completion_tokens,
        totalTokens: responseResult.usage.total_tokens,
        costUSD: cost,
        cached: false,
        timestamp: now
      }).catch(() => {});

      const statsRef = admin.database().ref(`users/${uid}/aiStats`);
      statsRef.transaction((current) => {
        const c = current || { totalRequests: 0, totalTokens: 0, totalCostUSD: 0 };
        c.totalRequests = (c.totalRequests || 0) + 1;
        c.totalTokens = (c.totalTokens || 0) + responseResult.usage.total_tokens;
        c.totalCostUSD = Number(((c.totalCostUSD || 0) + cost).toFixed(6));
        return c;
      }).catch(() => {});
    } catch (logErr) {
      console.warn("Usage log error:", logErr.message);
    }

    return res.json({
      ok: true,
      provider: "openai",
      model: usedModel,
      text: cleanText,
      tokenCount: responseResult.usage.total_tokens || 0
    });
  }
);

exports.geminiProxy = onRequest({ cors: true, secrets: [geminiApiKey] }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { prompt, systemPrompt, model = "gemini-2.0-flash" } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ ok: false, error: "Missing prompt" });
  }

  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: "Gemini API key is not configured on the server" });
  }

  try {
    const finalPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(response.status).json({
        ok: false,
        error: data?.error?.message || "Gemini request failed"
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("") || "";

    return res.json({
      ok: true,
      provider: "gemini",
      model,
      text,
      tokenCount: data?.usageMetadata?.totalTokenCount || 0
    });
  } catch (error) {
    console.error("Gemini proxy failed:", error);
    return res.status(500).json({ ok: false, error: error.message || "Unexpected server error" });
  }
});
