/*
 Profanity filter generator for Korean + mixed obfuscations.
 - Normalizes (NFKC), removes zero-width chars.
 - Collapses long runs of repeated chars.
 - Decomposes Hangul syllables into Jamo and generates Jamo-level regex.
 - Generates flexible regex allowing inserted symbols/spaces and elongation.

 Usage:
   const filter = await getProfanityFilter();
   filter.isProfane("ㅅ ㅣ ㅂ ㅏ ㄹ") // true
   filter.maskProfanity("너 ㅅ ㅣ ㅂ ㅏ ㄹ", {mode:'base'})
*/

import fs from "fs/promises";
import path from "path";

type MaskMode = "base" | "strong";

function escapeForRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CHOSEONG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];
const JUNGSEONG = [
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅘ",
  "ㅙ",
  "ㅚ",
  "ㅛ",
  "ㅜ",
  "ㅝ",
  "ㅞ",
  "ㅟ",
  "ㅠ",
  "ㅡ",
  "ㅢ",
  "ㅣ",
];
const JONGSEONG = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

function isHangulSyllable(code: number) {
  return code >= 0xac00 && code <= 0xd7a3;
}

function decomposeSyllableToJamo(char: string) {
  const code = char.charCodeAt(0);
  if (!isHangulSyllable(code)) return char;
  const SIndex = code - 0xac00;
  const cho = Math.floor(SIndex / (21 * 28));
  const jung = Math.floor((SIndex % (21 * 28)) / 28);
  const jong = SIndex % 28;
  const res = [CHOSEONG[cho], JUNGSEONG[jung]];
  if (JONGSEONG[jong]) res.push(JONGSEONG[jong]);
  return res.join("");
}

function decomposeStringToJamo(str: string) {
  let out = "";
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (isHangulSyllable(code)) out += decomposeSyllableToJamo(ch);
    else out += ch;
  }
  return out;
}

function removeZeroWidth(s: string) {
  return s.replace(/[\u200B-\u200F\uFEFF]/g, "");
}

function normalizeText(s: string): string {
  try {
    return s.normalize("NFKC");
  } catch {
    return s;
  }
}

function collapseRepeats(s: string) {
  return s.replace(/(.)\1{2,}/gu, "$1$1");
}

function preprocessForMatching(s: string) {
  let t = normalizeText(s);
  t = removeZeroWidth(t);
  t = collapseRepeats(t);
  return t;
}

function buildPatternForToken(token: string) {
  if (!token || typeof token !== "string") return null;
  const norm = preprocessForMatching(token);
  const sep = "(?:[^\\p{L}\\p{N}\\p{Script=Hangul}]*)";
  const chars = Array.from(norm);
  const syllableParts = chars
    .map((ch) => `${escapeForRegex(ch)}+${sep}`)
    .join("");
  const jamoForm = decomposeStringToJamo(norm);
  const jamoChars = Array.from(jamoForm);
  const jamoParts = jamoChars
    .map((ch) => `${escapeForRegex(ch)}+${sep}`)
    .join("");
  const combined = `(?:${syllableParts}|${jamoParts})`;
  return combined;
}

export type ProfanityFilter = {
  regexes: RegExp[];
  isProfane: (text: string) => boolean;
  maskProfanity: (text: string, options?: { mode?: MaskMode }) => string | null;
  _internal: {
    preprocessForMatching: (s: string) => string;
    decomposeStringToJamo: (s: string) => string;
    buildPatternForToken: (s: string) => string | null;
  };
};

function buildProfanityFilters(bannedList: string[] = []): ProfanityFilter {
  const patterns: string[] = [];
  for (const token of bannedList) {
    if (!token || typeof token !== "string") continue;
    const patt = buildPatternForToken(token);
    if (patt) patterns.push(patt);
  }
  const CHUNK = 80;
  const regexes: RegExp[] = [];
  for (let i = 0; i < patterns.length; i += CHUNK) {
    const chunk = patterns.slice(i, i + CHUNK).join("|");
    try {
      regexes.push(new RegExp(chunk, "giu"));
    } catch {
      const fallback = patterns
        .slice(i, i + CHUNK)
        .map((p) => `(?:${p})`)
        .join("|");
      regexes.push(new RegExp(fallback, "giu"));
    }
  }

  const isProfane = (text: string) => {
    if (!text) return false;
    const pre = preprocessForMatching(text);
    for (const r of regexes) {
      r.lastIndex = 0;
      if (r.test(pre)) return true;
    }
    return false;
  };

  const maskProfanity = (
    originalText: string,
    options: { mode?: MaskMode } = { mode: "base" }
  ) => {
    const mode = options.mode || "base";
    if (!originalText) return originalText;
    if (mode === "strong") {
      return isProfane(originalText) ? null : originalText;
    }
    let result = originalText;
    for (const r of regexes) {
      result = result.replace(new RegExp(r.source, "giu"), (m) =>
        "*".repeat(Math.max(3, Array.from(m).length))
      );
    }
    return result;
  };

  return {
    regexes,
    isProfane,
    maskProfanity,
    _internal: {
      preprocessForMatching,
      decomposeStringToJamo,
      buildPatternForToken,
    },
  };
}

let filterPromise: Promise<ProfanityFilter> | null = null;

export async function getProfanityFilter(): Promise<ProfanityFilter> {
  if (filterPromise) return filterPromise;
  filterPromise = (async () => {
    try {
      const p = path.join(
        process.cwd(),
        "public",
        "profinity",
        "profinity.json"
      );
      const buf = await fs.readFile(p, "utf-8");
      const arr = JSON.parse(buf) as unknown;
      const banned = Array.isArray(arr) ? (arr as unknown[]).map(String) : [];
      return buildProfanityFilters(banned);
    } catch {
      return buildProfanityFilters([]);
    }
  })();
  return filterPromise;
}
