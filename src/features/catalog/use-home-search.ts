import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import {
  HOME_SEARCH_DEFAULTS,
  type HomeSearch,
  type HomeSearchInput,
} from "./search-params";

/**
 * The single writer for home search state.
 *
 * History discipline lives here so it cannot drift between controls:
 *   - typing replaces (no history entry per keystroke, Back still leaves in one)
 *   - chips, selects and toggles push (Back/Forward steps through filters,
 *     which is an explicit audit scenario)
 *   - clearing pushes an empty search, which stripSearchParams reduces to "/"
 */
export function useSetHomeSearch(): {
  update: (patch: HomeSearchInput, opts?: { replace?: boolean }) => void;
  clear: () => void;
} {
  const navigate = useNavigate({ from: "/" });

  const update = useCallback(
    (patch: HomeSearchInput, opts?: { replace?: boolean }) => {
      void navigate({
        to: "/",
        search: (prev: HomeSearch) => ({ ...prev, ...patch }),
        replace: opts?.replace ?? false,
        resetScroll: false,
      });
    },
    [navigate],
  );

  const clear = useCallback(() => {
    void navigate({
      to: "/",
      search: () => ({ ...HOME_SEARCH_DEFAULTS }),
      resetScroll: false,
    });
  }, [navigate]);

  return { update, clear };
}
