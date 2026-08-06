import { render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useHotkeyFocus } from "../../src/lib/use-hotkey-focus.ts";

function Harness({ onClear }: { onClear?: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useHotkeyFocus(ref, onClear);
  return (
    <div>
      <input ref={ref} data-testid="search" />
      <textarea data-testid="note" />
      <button data-testid="btn">click</button>
    </div>
  );
}

function press(key: string, init: KeyboardEventInit = {}, target?: Element) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  (target ?? document).dispatchEvent(event);
  return event;
}

describe("useHotkeyFocus", () => {
  it("focuses the field on /", () => {
    const { getByTestId } = render(<Harness />);
    press("/");
    expect(document.activeElement).toBe(getByTestId("search"));
  });

  it("prevents default on / so the slash is not typed into the field", () => {
    render(<Harness />);
    const event = press("/");
    expect(event.defaultPrevented).toBe(true);
  });

  it("focuses the field on Mod+K", () => {
    const { getByTestId } = render(<Harness />);
    press("k", { metaKey: true });
    expect(document.activeElement).toBe(getByTestId("search"));
    (document.activeElement as HTMLElement).blur();
    press("k", { ctrlKey: true });
    expect(document.activeElement).toBe(getByTestId("search"));
  });

  it("does not hijack / while typing in a textarea", () => {
    const { getByTestId } = render(<Harness />);
    const note = getByTestId("note");
    (note as HTMLTextAreaElement).focus();
    const event = press("/", {}, note);
    expect(document.activeElement).toBe(note);
    expect(event.defaultPrevented).toBe(false);
  });

  it("does not hijack / while typing in the search field itself", () => {
    const { getByTestId } = render(<Harness />);
    const search = getByTestId("search");
    (search as HTMLInputElement).focus();
    const event = press("/", {}, search);
    expect(event.defaultPrevented).toBe(false);
  });

  it("clears and blurs on Escape when focused", () => {
    const onClear = vi.fn();
    const { getByTestId } = render(<Harness onClear={onClear} />);
    const search = getByTestId("search") as HTMLInputElement;
    search.focus();
    press("Escape", {}, search);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(document.activeElement).not.toBe(search);
  });

  it("ignores Escape when the field is not focused", () => {
    const onClear = vi.fn();
    render(<Harness onClear={onClear} />);
    press("Escape");
    expect(onClear).not.toHaveBeenCalled();
  });

  it("removes its listener on unmount", () => {
    const { unmount, getByTestId } = render(<Harness />);
    const search = getByTestId("search");
    unmount();
    press("/");
    expect(document.activeElement).not.toBe(search);
  });
});
