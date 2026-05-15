import type { ChatMessage as ChatMessageType } from "../../party/types";

interface Props {
  message: ChatMessageType;
  isMine: boolean;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function ChatMessage({ message, isMine }: Props) {
  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      <div className="mb-1 max-w-full px-1 text-xs text-gray-500">
        <span className="font-medium text-gray-400">{message.playerName}</span>
        <span className="ml-2">{formatTime(message.sentAt)}</span>
      </div>
      <div
        className={`max-w-full break-words rounded-lg px-3 py-2 text-sm ${
          isMine ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
