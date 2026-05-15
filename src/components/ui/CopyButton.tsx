interface Props {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = "コピー" }: Props) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value)}
      className="mt-2 text-xs bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded transition-colors"
    >
      {label}
    </button>
  );
}
