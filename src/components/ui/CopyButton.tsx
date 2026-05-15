interface Props {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = "コピー" }: Props) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value)}
      className="mt-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition-colors"
    >
      {label}
    </button>
  );
}
