interface Props {
  onClick: () => void;
  disabled?: boolean;
}

export function BuzzButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-64 h-64 rounded-full text-4xl font-black shadow-2xl transition-all select-none
        ${
          disabled
            ? "bg-gray-600 text-gray-400 cursor-not-allowed scale-95"
            : "bg-red-500 hover:bg-red-400 active:scale-95 text-white cursor-pointer hover:shadow-red-500/50"
        }`}
    >
      早押し!
    </button>
  );
}
