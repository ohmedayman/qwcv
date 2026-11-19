/**
 * Vercel Serverless Function: /api/ai
 * Provides the identical backend OpenAI API proxy for QCV deployments on Vercel.
 */
const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://qwcv-1cfad-default-rtdb.firebaseio.com"
      });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.warn("Firebase admin init warning:", e.message);
  }
}

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

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  // 1. Authenticate user
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      ok: false,
      error: "يرجى تسجيل الدخول أولاً للوصول إلى ميزات الذكاء الاصطناعي.",
      code: "AUTH_REQUIRED"
    });
  }

  const idToken = authHeader.split("Bearer ")[1].trim();
  let uid = "";
  try {
    if (admin.apps.length) {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } else {
      // In minimal test mode without admin SDK initialized
      uid = "authenticated_user";
    }
  } catch (authErr) {
    return res.status(401).json({
      ok: false,
      error: "جلسة المستخدم منتهية أو غير صالحة. يرجى تسجيل الدخول مجدداً.",
      code: "AUTH_INVALID"
    });
  }

  // 2. Validate User Plan & Subscription Status
  let plan = "pro";
  if (admin.apps.length && uid !== "authenticated_user") {
    try {
      const snap = await admin.database().ref(`users/${uid}`).once("value");
      const userData = snap.val() || {};
      plan = userData.plan || (userData.subscription && userData.subscription.plan) || "free";
      const expiresAt = userData.planExpiresAt || (userData.subscription && userData.subscription.expiresAt) || 0;
      if (expiresAt > 0 && Date.now() > expiresAt) plan = "free";
    } catch (_) {}
  }

  if (plan === "free") {
    return res.status(403).json({
      ok: false,
      error: "ميزات الذكاء الاصطناعي مخصصة للمشتركين فقط (باقات Pro أو Unlimited). يرجى الترقية للمتابعة.",
      code: "UPGRADE_REQUIRED"
    });
  }

  const { prompt, systemPrompt, task = "general", language = "ar", modelOverride } = req.body || {};

  const PRO_ONLY_TASKS = ["job_tailor", "skills_gap", "interview_prep"];
  if (PRO_ONLY_TASKS.includes(task) && plan !== "pro" && plan !== "unlimited" && plan !== "pass_48h") {
    return res.status(403).json({
      ok: false,
      error: "هذه الميزة المتقدمة متاحة حصرياً لمشتركي باقة Pro أو Unlimited.",
      code: "PRO_REQUIRED"
    });
  }

  // 3. User Rate Limiting (20 calls/minute)
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

  // 4. Validate Prompt
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

  // 5. 5-Minute Cache
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

  // 6. Server Key
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "مفتاح OpenAI غير مهيأ على السيرفر (OPENAI_API_KEY is not configured).",
      code: "SERVER_CONFIG_ERROR"
    });
  }

  // 7. Models
  const FAST_TASKS = ["summary", "proofread", "enhance", "skills", "ats", "translate"];
  const DEEP_TASKS = ["cover_letter", "job_tailor", "skills_gap", "interview_prep", "ask_ai"];

  const FAST_MODEL = process.env.OPENAI_FAST_MODEL || "gpt-4o-mini";
  const DEEP_MODEL = process.env.OPENAI_DEEP_MODEL || "gpt-4o";
  const FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || "gpt-4.1-mini";

  let primaryModel = FAST_TASKS.includes(task) ? FAST_MODEL : DEEP_MODEL;
  if (modelOverride) primaryModel = modelOverride;

  const maxTokens = DEEP_TASKS.includes(task) ? 2500 : 1200;

  // 8. Bilingual System Prompt
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

  // 10. Clean text
  let cleanText = (responseResult.text || "").trim();
  cleanText = cleanText.replace(/^```(?:markdown|text|json)?\s*([\s\S]*?)\s*```$/g, "$1").trim();

  // 11. Cache (5 min)
  aiCache.set(cacheKey, {
    text: cleanText,
    model: usedModel,
    tokenCount: responseResult.usage.total_tokens || 0,
    timestamp: now
  });

  // 12. Log Usage
  if (admin.apps.length && uid !== "authenticated_user") {
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
    } catch (_) {}
  }

  return res.json({
    ok: true,
    provider: "openai",
    model: usedModel,
    text: cleanText,
    tokenCount: responseResult.usage.total_tokens || 0
  });
};
