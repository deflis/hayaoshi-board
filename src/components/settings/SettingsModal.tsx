import { X } from "lucide-react";
import { useUserSettings } from "../../stores/userSettings";
import { ToggleRow } from "../ui/ToggleRow";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const soundEnabled = useUserSettings((s) => s.soundEnabled);
  const setSoundEnabled = useUserSettings((s) => s.setSoundEnabled);
  const enterBuzzEnabled = useUserSettings((s) => s.enterBuzzEnabled);
  const setEnterBuzzEnabled = useUserSettings((s) => s.setEnterBuzzEnabled);
  const spaceBuzzEnabled = useUserSettings((s) => s.spaceBuzzEnabled);
  const setSpaceBuzzEnabled = useUserSettings((s) => s.setSpaceBuzzEnabled);
  const numpadEnterBuzzEnabled = useUserSettings(
    (s) => s.numpadEnterBuzzEnabled,
  );
  const setNumpadEnterBuzzEnabled = useUserSettings(
    (s) => s.setNumpadEnterBuzzEnabled,
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="設定"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        role="document"
        className="relative w-full max-w-sm rounded-2xl bg-white border border-gray-200 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-6">設定</h2>

        <div className="space-y-4">
          <ToggleRow
            label="効果音"
            checked={soundEnabled}
            onChange={setSoundEnabled}
          />

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500 mb-3">キーボード早押し</p>
            <div className="space-y-3">
              <ToggleRow
                label="Enter"
                checked={enterBuzzEnabled}
                onChange={setEnterBuzzEnabled}
              />
              <ToggleRow
                label="Space"
                checked={spaceBuzzEnabled}
                onChange={setSpaceBuzzEnabled}
              />
              <ToggleRow
                label="Numpad Enter"
                checked={numpadEnterBuzzEnabled}
                onChange={setNumpadEnterBuzzEnabled}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
