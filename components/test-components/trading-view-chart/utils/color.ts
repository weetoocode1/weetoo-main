export function resolveCssVarToColor(varName: string): string | null {
  try {
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.background = `var(${varName})`;
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).backgroundColor;
    document.body.removeChild(probe);
    return rgb || null;
  } catch {
    return null;
  }
}

export function resolveAppBackground(currentTheme?: string): string {
  const raw = resolveCssVarToColor("--background");
  const isValid = (c: string | null | undefined) =>
    !!c &&
    (/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/.test(c) || /^rgb(a)?\(/.test(c));
  if (isValid(raw)) return raw as string;
  return currentTheme === "light" ? "#ffffff" : "#0a0a0a";
}
