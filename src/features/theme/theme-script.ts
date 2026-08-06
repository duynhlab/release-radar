export const THEME_STORAGE_KEY = "release-radar:theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/**
 * Runs synchronously in <head> before first paint, so the page never flashes
 * the wrong theme. Kept as a string constant rather than inline JSX so it can
 * be linted and unit-tested via `new Function`.
 *
 * It writes two things: the resolved class (.light/.dark) that CSS keys off,
 * and the *preference* in data-theme, which the toggle needs to know whether
 * "system" is currently selected.
 *
 * <html> carries suppressHydrationWarning and no className so React never
 * fights this script over the attribute it mutates.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}",p=localStorage.getItem(k),t=(p==="light"||p==="dark")?p:"system",r=t==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t,e=document.documentElement;e.classList.remove("light","dark");e.classList.add(r);e.dataset.theme=t;e.style.colorScheme=r}catch(_){document.documentElement.classList.add("dark")}})()`;
