import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Map Perspective attribute scores to a single isProfane + severity + matches
const DEFAULT_REQUESTED_ATTRIBUTES = {
  TOXICITY: {},
  INSULT: {},
  PROFANITY: {},
  THREAT: {},
  SEVERE_TOXICITY: {},
  SEXUALLY_EXPLICIT: {},
};

const SEVERITY_THRESHOLD = {
  low: 0.6,
  medium: 0.75,
  high: 0.85,
};

function computeSeverity(maxScore: number): "low" | "medium" | "high" {
  if (maxScore >= SEVERITY_THRESHOLD.high) return "high";
  if (maxScore >= SEVERITY_THRESHOLD.medium) return "medium";
  return "low";
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 2,
  timeoutMs = 7000
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === retries) throw err;
      // exponential backoff: 300ms, 900ms
      const delay = 300 * Math.pow(3, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("unreachable");
}

// ===== Custom keyword list (loaded from public/profinity/profinity.json) =====
let CUSTOM_KEYWORDS: string[] | null = null;
let KO_REGEX: RegExp | null = null;
let KO_WORDS_LOADED = false;
let JAMO_STRONG_RE: RegExp | null = null;
async function ensureCustomKeywordsLoaded() {
  if (CUSTOM_KEYWORDS) return;
  try {
    const p = path.join(process.cwd(), "public", "profinity", "profinity.json");
    const buf = await fs.readFile(p, "utf-8");
    const arr = JSON.parse(buf);
    if (Array.isArray(arr)) {
      CUSTOM_KEYWORDS = arr
        .map((s) => String(s))
        .map((s) =>
          s
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}+/gu, "")
        );
    } else {
      CUSTOM_KEYWORDS = [];
    }
  } catch {
    CUSTOM_KEYWORDS = [];
  }
}

// ===== Korean flexible regex loader =====
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildKoCombinedRegex(words: string[]) {
  // Allow non-letters/digits/underscore between characters to catch obfuscations
  const sep = "[\\W_0-9]*";
  const patterns = words
    .map((w) => (w || "").trim())
    .filter(Boolean)
    .map((w) =>
      Array.from(w)
        .map((ch) => escapeRegex(ch))
        .join(sep)
    );
  const source = patterns.length ? patterns.join("|") : "(?!x)x"; // never match when empty
  return new RegExp(source, "giu");
}

async function ensureKoRegexLoaded() {
  if (KO_REGEX || KO_WORDS_LOADED) return;
  KO_WORDS_LOADED = true;
  try {
    const p = path.join(
      process.cwd(),
      "public",
      "profinity",
      "banned_words_ko.json"
    );
    const buf = await fs.readFile(p, "utf-8");
    const arr = JSON.parse(buf) as string[];
    if (Array.isArray(arr) && arr.length) {
      KO_REGEX = buildKoCombinedRegex(arr);
      JAMO_STRONG_RE = buildKoJamoRegex(arr);
    }
  } catch {
    KO_REGEX = null;
    JAMO_STRONG_RE = null;
  }
}

// ===== Strong Korean (JAMO-level) =====
function isHangulSyllable(code: number) {
  return code >= 0xac00 && code <= 0xd7a3;
}
function decomposeHangulToJamoChar(ch: string): string {
  const code = ch.charCodeAt(0);
  if (!isHangulSyllable(code)) return ch;
  const sIndex = code - 0xac00;
  const choseongIndex = Math.floor(sIndex / (21 * 28));
  const jungseongIndex = Math.floor((sIndex % (21 * 28)) / 28);
  const jongseongIndex = sIndex % 28;
  const CHOSEONG_BASE = 0x1100;
  const JUNGSEONG_BASE = 0x1161;
  const JONGSEONG_BASE = 0x11a7; // 0x11a8 is first real jong
  const jamo: string[] = [];
  jamo.push(String.fromCharCode(CHOSEONG_BASE + choseongIndex));
  jamo.push(String.fromCharCode(JUNGSEONG_BASE + jungseongIndex));
  if (jongseongIndex > 0)
    jamo.push(String.fromCharCode(JONGSEONG_BASE + jongseongIndex));
  return jamo.join("");
}
function decomposeHangulToJamo(text: string): string {
  return Array.from(text)
    .map((ch) => decomposeHangulToJamoChar(ch))
    .join("");
}
function normalizeKorean(text: string): string {
  let t = text.normalize("NFKC");
  t = t.replace(/[\u200B-\u200F\u202A-\u202E]/g, "");
  t = t.replace(/(.)\1{2,}/g, "$1$1");
  return t;
}
function jamoNormalize(text: string): string {
  return decomposeHangulToJamo(text).toLowerCase().normalize("NFD");
}
function buildKoJamoRegex(words: string[]) {
  const sep = "[\\W_0-9]*";
  const parts = words
    .map((w) => (w || "").trim())
    .filter(Boolean)
    .map((w) => decomposeHangulToJamo(w))
    .map((wj) =>
      Array.from(wj)
        .map((ch) => escapeRegex(ch))
        .join(sep)
    );
  const source = parts.length ? parts.join("|") : "(?!x)x";
  return new RegExp(source, "giu");
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY not configured" },
        { status: 500 }
      );
    }

    await ensureCustomKeywordsLoaded();
    await ensureKoRegexLoaded();

    const body = await req.json().catch(() => ({}));
    const text: string = body?.text ?? "";
    const languages: string[] | undefined = body?.languages;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Invalid request: text is required" },
        { status: 400 }
      );
    }

    const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`;

    // Early keyword policy check (short-circuit): if match, return masked response without calling Perspective
    const earlyNormalized = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}+/gu, "");
    const earlyKeywords = [
      // English profanity
      "fuck",
      "fucking",
      "fucker",
      "motherfucker",
      "fucked",
      "shit",
      "shitting",
      "shitty",
      "bullshit",
      "horseshit",
      "bitch",
      "bitches",
      "bitching",
      "bitchy",
      "bastard",
      "basterd",
      "bastards",
      "damn",
      "damned",
      "damning",
      "hell",
      "hells",
      "hellish",
      "ass",
      "asses",
      "asshole",
      "assholes",
      "crap",
      "crappy",
      "craps",
      "piss",
      "pissing",
      "pissed",
      "pissed off",
      "dick",
      "dicks",
      "dickhead",
      "dickheads",
      "cock",
      "cocks",
      "cocksucker",
      "cocksuckers",
      "pussy",
      "pussies",
      "pussys",
      "whore",
      "whores",
      "whoring",
      "slut",
      "sluts",
      "slutty",
      "porn",
      "porno",
      "pornhub",
      "pornographic",
      "sex",
      "sexual",
      "sexually",
      "nude",
      "nudes",
      "naked",
      "nudity",
      // Korean profanity
      "씨발",
      "시발",
      "씨팔",
      "시팔",
      "개새끼",
      "개새키",
      "개쓰레기",
      "지랄",
      "지랄하네",
      "병신",
      "바보",
      "멍청이",
      "포르노",
      "야동",
      "섹스",
      "성인",
      "음란",
      // Japanese profanity
      "ばか",
      "バカ",
      "あほ",
      "アホ",
      "くそ",
      "クソ",
      "ちくしょう",
      "チクショウ",
      "ポルノ",
      "エロ",
      "セックス",
      "成人",
      // Chinese profanity
      "色情",
      "黄色",
      "成人",
      "性爱",
      "裸体",
      // Common misspellings and variations
      "fuk",
      "fuking",
      "fuker",
      "fuked",
      "sh1t",
      "sh1tty",
      "sh1tting",
      "b1tch",
      "b1tches",
      "b1tching",
      "b4stard",
      "b4sterd",
      "b4stards",
      "d1ck",
      "d1cks",
      "d1ckhead",
      "c0ck",
      "c0cks",
      "c0cksucker",
      "p0rn",
      "p0rno",
      "p0rnhub",
      // Custom
      ...(CUSTOM_KEYWORDS || []),
    ];
    // Build normalized index map to support masking ranges
    const buildNormalizedIndexMap = (input: string) => {
      const map: number[] = [];
      let norm = "";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        const n = ch
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}+/gu, "");
        norm += n;
        for (let k = 0; k < n.length; k++) map.push(i);
      }
      return { norm, map };
    };

    const maskByKeywords = (input: string, keywords: string[]) => {
      const { norm, map } = buildNormalizedIndexMap(input);
      const mask: boolean[] = new Array(input.length).fill(false);
      for (const kw of keywords) {
        const needle = kw.toLowerCase();
        let start = 0;
        while (true) {
          const idx = norm.indexOf(needle, start);
          if (idx === -1) break;
          const endNorm = idx + needle.length - 1;
          const startOrig = map[idx];
          const endOrig = map[endNorm];
          for (let j = startOrig; j <= endOrig; j++) mask[j] = true;
          start = idx + 1;
        }
      }
      let masked = "";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        masked += mask[i] ? (/\s/.test(ch) ? ch : "*") : ch;
      }
      const matched = mask.some(Boolean);
      return { matched, masked };
    };

    if (earlyKeywords.some((kw) => earlyNormalized.includes(kw))) {
      const { masked } = maskByKeywords(text, earlyKeywords);
      return NextResponse.json({
        isProfane: true,
        severity: "low",
        matches: ["KEYWORD"],
        scores: {},
        maskedText: masked,
      });
    }
    // Korean regex-based mask pass (handles obfuscations like 시-발, 씨1발, etc.)
    if (KO_REGEX && KO_REGEX.test(text)) {
      const maskedText = (text as string).replace(KO_REGEX, (m) =>
        "*".repeat(Array.from(m).length)
      );
      return NextResponse.json({
        isProfane: true,
        severity: "low",
        matches: ["KO_REGEX"],
        scores: {},
        maskedText,
      });
    }

    // Strong mode: JAMO-level scan, replace entire message when matched
    {
      const norm = normalizeKorean(text);
      const jam = jamoNormalize(norm);
      if (JAMO_STRONG_RE && JAMO_STRONG_RE.test(jam)) {
        return NextResponse.json({
          isProfane: true,
          severity: "low",
          matches: ["KO_JAMO_STRONG"],
          scores: {},
          maskedText: "***",
        });
      }
    }

    // Attempt with languages
    interface PerspectiveRequest {
      comment: { text: string };
      languages?: string[];
      requestedAttributes: Record<string, Record<string, never>>;
      doNotStore: boolean;
    }
    let perspectiveReq: PerspectiveRequest = {
      comment: { text },
      languages:
        Array.isArray(languages) && languages.length ? languages : undefined,
      requestedAttributes: DEFAULT_REQUESTED_ATTRIBUTES,
      doNotStore: true,
    };

    let resp = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perspectiveReq),
      },
      2,
      7000
    );

    let textBody = await resp.text();
    type PerspectiveJson = {
      attributeScores?: Record<
        string,
        {
          spanScores?: {
            begin: number;
            end: number;
            score: { value: number; type?: string };
          }[];
          summaryScore?: { value: number; type?: string };
        }
      >;
      error?: {
        details?: unknown[];
      };
      [k: string]: unknown;
    } | null;
    let json: PerspectiveJson = null;
    try {
      json = JSON.parse(textBody);
    } catch {}

    // If languages unsupported by attribute, retry without languages (let Perspective auto-detect)
    const isLangUnsupported =
      resp.status === 400 &&
      Array.isArray(json?.error?.details) &&
      (json!.error!.details as unknown[]).some(
        (d) =>
          typeof d === "object" &&
          d !== null &&
          ("languageNotSupportedByAttributeError" in
            (d as Record<string, unknown>) ||
            (d as Record<string, unknown>)["errorType"] ===
              "LANGUAGE_NOT_SUPPORTED_BY_ATTRIBUTE")
      );

    if (isLangUnsupported) {
      perspectiveReq = {
        comment: { text },
        requestedAttributes: DEFAULT_REQUESTED_ATTRIBUTES,
        doNotStore: true,
      };
      resp = await fetchWithRetry(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(perspectiveReq),
        },
        2,
        7000
      );
      textBody = await resp.text();
      json = null;
      try {
        json = JSON.parse(textBody);
      } catch {}
    }

    // If the payload already contains usable scores, proceed even if status != 200
    if (!resp.ok && !(json && json.attributeScores)) {
      const status = resp.status;
      // Pass through 4xx with details for better UX
      if (status >= 400 && status < 500) {
        const details = Array.isArray(json?.error?.details)
          ? (json!.error!.details as unknown[])
          : [];
        interface LangUnsupportedDetail {
          languageNotSupportedByAttributeError?: { attribute?: string };
          errorType?: string;
          [k: string]: unknown;
        }
        const unsupportedAttr = details
          .map(
            (d) =>
              (d as LangUnsupportedDetail)?.languageNotSupportedByAttributeError
                ?.attribute
          )
          .find((a) => typeof a === "string") as string | undefined;
        if (unsupportedAttr) {
          const filteredAttributes: Record<string, Record<string, never>> = {
            ...DEFAULT_REQUESTED_ATTRIBUTES,
          };
          delete (filteredAttributes as Record<string, unknown>)[
            unsupportedAttr
          ];

          const altReq: PerspectiveRequest = {
            comment: { text },
            requestedAttributes: filteredAttributes,
            doNotStore: true,
          };

          const altResp = await fetchWithRetry(
            url,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(altReq),
            },
            2,
            7000
          );
          const altText = await altResp.text();
          let altJson: PerspectiveJson = null;
          try {
            altJson = JSON.parse(altText);
          } catch {}

          if (altResp.ok) {
            json = altJson;
            resp = altResp;
          } else {
            return NextResponse.json(
              {
                error: "Perspective API client error",
                detail: altJson ?? altText,
              },
              { status: altResp.status }
            );
          }
        } else {
          return NextResponse.json(
            { error: "Perspective API client error", detail: json ?? textBody },
            { status }
          );
        }
      }
      // For 5xx, return 502 with provider details
      return NextResponse.json(
        { error: "Perspective API error", detail: json ?? textBody },
        { status: 502 }
      );
    }

    const data = json && json.attributeScores ? json : json ?? {};
    const attributeScores = data?.attributeScores ?? {};
    const scores: Record<string, number> = {};
    let maxScore = 0;
    let topAttributes: string[] = [];

    for (const key of Object.keys(attributeScores)) {
      const summaryScore = attributeScores[key]?.summaryScore?.value ?? 0;
      scores[key] = summaryScore;
      if (summaryScore > maxScore) {
        maxScore = summaryScore;
        topAttributes = [key];
      } else if (summaryScore === maxScore && maxScore > 0) {
        topAttributes.push(key);
      }
    }

    // Policy overlay: quick keyword blocklist (multilingual, minimal)
    // Admin-configurable in future; kept small to avoid overblocking
    const RAW_TEXT = (body?.text as string) || "";
    const normalized = RAW_TEXT.toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}+/gu, "");
    const KEYWORD_BLOCKLIST = [
      // English profanity
      "fuck",
      "fucking",
      "fucker",
      "motherfucker",
      "fucked",
      "shit",
      "shitting",
      "shitty",
      "bullshit",
      "horseshit",
      "bitch",
      "bitches",
      "bitching",
      "bitchy",
      "bastard",
      "basterd",
      "bastards",
      "damn",
      "damned",
      "damning",
      "hell",
      "hells",
      "hellish",
      "ass",
      "asses",
      "asshole",
      "assholes",
      "crap",
      "crappy",
      "craps",
      "piss",
      "pissing",
      "pissed",
      "pissed off",
      "dick",
      "dicks",
      "dickhead",
      "dickheads",
      "cock",
      "cocks",
      "cocksucker",
      "cocksuckers",
      "pussy",
      "pussies",
      "pussys",
      "whore",
      "whores",
      "whoring",
      "slut",
      "sluts",
      "slutty",
      "porn",
      "porno",
      "pornhub",
      "pornographic",
      "sex",
      "sexual",
      "sexually",
      "nude",
      "nudes",
      "naked",
      "nudity",
      // Korean profanity
      "씨발",
      "시발",
      "씨팔",
      "시팔",
      "개새끼",
      "개새키",
      "개쓰레기",
      "지랄",
      "지랄하네",
      "병신",
      "바보",
      "멍청이",
      "포르노",
      "야동",
      "섹스",
      "성인",
      "음란",
      // Japanese profanity
      "ばか",
      "バカ",
      "あほ",
      "アホ",
      "くそ",
      "クソ",
      "ちくしょう",
      "チクショウ",
      "ポルノ",
      "エロ",
      "セックス",
      "成人",
      // Chinese profanity
      "色情",
      "黄色",
      "成人",
      "性爱",
      "裸体",
      // Common misspellings and variations
      "fuk",
      "fuking",
      "fuker",
      "fuked",
      "sh1t",
      "sh1tty",
      "sh1tting",
      "b1tch",
      "b1tches",
      "b1tching",
      "b4stard",
      "b4sterd",
      "b4stards",
      "d1ck",
      "d1cks",
      "d1ckhead",
      "c0ck",
      "c0cks",
      "c0cksucker",
      "p0rn",
      "p0rno",
      "p0rnhub",
      // Custom list
      ...(CUSTOM_KEYWORDS || []),
    ];

    let keywordHit = false;
    for (const kw of KEYWORD_BLOCKLIST) {
      if (normalized.includes(kw.toLowerCase())) {
        keywordHit = true;
        break;
      }
    }

    const isProfane = keywordHit || maxScore >= SEVERITY_THRESHOLD.low;
    const severity = computeSeverity(maxScore);

    // Create maskedText using either keyword policy or Perspective spanScores
    let maskedText: string | undefined = undefined;
    const isLetter = (ch: string) => /\p{L}/u.test(ch);
    const maskBySpanScores = (input: string) => {
      const mask: boolean[] = new Array(input.length).fill(false);
      const spans = attributeScores?.PROFANITY?.spanScores as
        | { begin: number; end: number; score: { value: number } }[]
        | undefined;
      if (spans) {
        for (const s of spans) {
          if ((s?.score?.value ?? 0) >= 0.6) {
            let b = Math.max(0, s.begin || 0);
            let e = Math.min(input.length, s.end || 0);
            // tighten to only mask letters inside the span
            while (b < e && !isLetter(input[b])) b++;
            while (e > b && !isLetter(input[e - 1])) e--;
            for (let i = b; i < e; i++) if (isLetter(input[i])) mask[i] = true;
          }
        }
      }
      let out = "";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        out += mask[i] ? (isLetter(ch) ? "*" : ch) : ch;
      }
      return { any: mask.some(Boolean), out };
    };

    const RAW_TEXT_LOCAL = RAW_TEXT as string;
    const maskByKeywordsTight = (input: string, keywords: string[]) => {
      // tokenize by letters vs non-letters
      const tokens: {
        start: number;
        end: number;
        text: string;
        norm: string;
      }[] = [];
      let i = 0;
      while (i < input.length) {
        const isL = isLetter(input[i]);
        const start = i;
        while (i < input.length && isLetter(input[i]) === isL) i++;
        const end = i;
        const text = input.slice(start, end);
        const norm = text
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}+/gu, "");
        tokens.push({ start, end, text, norm });
      }
      const mask = new Array(input.length).fill(false);
      for (const tkn of tokens) {
        if (!tkn.text || !isLetter(tkn.text[0])) continue;
        for (const kw of keywords) {
          if (tkn.norm.includes(kw)) {
            for (let p = tkn.start; p < tkn.end; p++)
              if (isLetter(input[p])) mask[p] = true;
            break;
          }
        }
      }
      let out = "";
      for (let p = 0; p < input.length; p++) {
        const ch = input[p];
        out += mask[p] ? (isLetter(ch) ? "*" : ch) : ch;
      }
      return { any: mask.some(Boolean), out };
    };

    const kwMasked = maskByKeywordsTight(RAW_TEXT_LOCAL, KEYWORD_BLOCKLIST);
    if (kwMasked.any) {
      maskedText = kwMasked.out;
    } else {
      const spanMasked = maskBySpanScores(RAW_TEXT_LOCAL);
      if (spanMasked.any) maskedText = spanMasked.out;
    }

    return NextResponse.json({
      isProfane,
      severity,
      matches: keywordHit ? ["KEYWORD"] : topAttributes,
      scores,
      maskedText,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Unexpected error", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
