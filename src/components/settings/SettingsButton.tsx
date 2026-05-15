import { Settings } from "lucide-react";
import { useState } from "react";
import { SettingsModal } from "./SettingsModal";

export function SettingsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-gray-400 hover:text-gray-700 transition-colors"
        title="設定"
      >
        <Settings size={20} />
      </button>
      {open && <SettingsModal onClose={() => setOpen(false)} />}
    </>
  );
}
