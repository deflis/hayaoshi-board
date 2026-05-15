import { useUserSettings } from "../../stores/userSettings";

interface Props {
  onClick: () => void;
  disabled?: boolean;
}

export function BuzzButton({ onClick, disabled }: Props) {
  const enterBuzzEnabled = useUserSettings((s) => s.enterBuzzEnabled);
  const spaceBuzzEnabled = useUserSettings((s) => s.spaceBuzzEnabled);
  const numpadEnterBuzzEnabled = useUserSettings(
    (s) => s.numpadEnterBuzzEnabled,
  );

  const shortcutKeys: string[] = [];
  if (spaceBuzzEnabled) shortcutKeys.push("Space");
  if (enterBuzzEnabled) shortcutKeys.push("Enter");
  if (numpadEnterBuzzEnabled) shortcutKeys.push("Num Enter");

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full py-6 rounded-lg text-3xl font-black shadow-lg transition-all select-none
          ${
            disabled
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white cursor-pointer"
          }`}
      >
        早押し!
      </button>
      {shortcutKeys.length > 0 && !disabled && (
        <p className="text-gray-400 text-xs">
          キーボード: {shortcutKeys.join(" / ")}
        </p>
      )}
    </div>
  );
}
