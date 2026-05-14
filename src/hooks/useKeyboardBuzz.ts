import { useEffect } from "react";
import { useUserSettings } from "../stores/userSettings";

export function useKeyboardBuzz(onBuzz: () => void) {
  const enterBuzzEnabled = useUserSettings((s) => s.enterBuzzEnabled);
  const spaceBuzzEnabled = useUserSettings((s) => s.spaceBuzzEnabled);
  const numpadEnterBuzzEnabled = useUserSettings(
    (s) => s.numpadEnterBuzzEnabled,
  );

  useEffect(() => {
    if (!enterBuzzEnabled && !spaceBuzzEnabled && !numpadEnterBuzzEnabled)
      return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const shouldBuzz =
        (enterBuzzEnabled && e.key === "Enter" && e.code === "Enter") ||
        (spaceBuzzEnabled && e.key === " ") ||
        (numpadEnterBuzzEnabled && e.code === "NumpadEnter");

      if (shouldBuzz) {
        e.preventDefault();
        onBuzz();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enterBuzzEnabled, spaceBuzzEnabled, numpadEnterBuzzEnabled, onBuzz]);
}
