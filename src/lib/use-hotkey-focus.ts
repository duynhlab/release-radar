import { useEffect, type RefObject } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * `/` or Mod+K focuses the search field; Escape clears and blurs it.
 *
 * A ~30-line tested hook instead of @tanstack/react-hotkeys, which is alpha and
 * aimed at apps with many shortcuts, scopes and conflict management. Revisit if
 * that ever describes this app.
 */
export function useHotkeyFocus(
  ref: RefObject<HTMLInputElement | null>,
  onClear?: () => void,
): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const input = ref.current;
      if (!input) return;

      if (event.key === "Escape" && document.activeElement === input) {
        onClear?.();
        input.blur();
        return;
      }

      const isSlash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      const isModK =
        event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);

      if ((isSlash || isModK) && !isTypingTarget(event.target)) {
        // Without preventDefault the "/" would be typed into the field it just
        // focused.
        event.preventDefault();
        input.focus();
        input.select();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [ref, onClear]);
}
