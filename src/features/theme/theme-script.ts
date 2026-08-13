export const THEME_STORAGE_KEY = "release-radar:theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/**
 * sRGB renderings of the two --rr-bg tokens in app.css, for the theme-color
 * meta — browser UI chrome can't read CSS variables, and a media-query meta
 * pair would ignore the manual .light/.dark override, so the theme code owns
 * the value. Keep in sync with app.css (tests/unit/contrast.test.ts pins the
 * mapping).
 */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: "#0c0e13", // oklch(0.165 0.01 264)
  light: "#f9fafb", // oklch(0.985 0.002 264)
};

/**
 * Runs synchronously in <head> before first paint, so the page never flashes
 * the wrong theme. Kept as a string constant rather than inline JSX so it can
 * be linted and unit-tested via `new Function`.
 *
 * It writes three things: the resolved class (.light/.dark) that CSS keys off,
 * the *preference* in data-theme, which the toggle needs to know whether
 * "system" is currently selected, and the theme-color meta so browser chrome
 * matches the resolved background (created if the head hasn't emitted it yet).
 *
 * <html> carries suppressHydrationWarning and no className so React never
 * fights this script over the attribute it mutates.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}",p=localStorage.getItem(k),t=(p==="light"||p==="dark")?p:"system",r=t==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t,e=document.documentElement;e.classList.remove("light","dark");e.classList.add(r);e.dataset.theme=t;e.style.colorScheme=r;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.setAttribute("name","theme-color");document.head.appendChild(m)}m.setAttribute("content",r==="light"?"${THEME_COLORS.light}":"${THEME_COLORS.dark}")}catch(_){document.documentElement.classList.add("dark")}})()`;
