import { ToggleSwitch } from "./ToggleSwitch";

interface Props {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleRow({ label, checked, onChange }: Props) {
  const toggle = () => onChange(!checked);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="flex w-full items-center justify-between cursor-pointer"
      onClick={toggle}
    >
      <span className="text-white">{label}</span>
      <ToggleSwitch checked={checked} />
    </button>
  );
}
