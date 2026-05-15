import { Send } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { ClientMessage, RoomState } from "../../party/types";
import { ChatMessage } from "./ChatMessage";

interface Props {
  state: RoomState;
  myPlayerId: string | null;
  send: (msg: ClientMessage) => void;
}

export function ChatPanel({ state, myPlayerId, send }: Props) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messages = state.chatMessages;
  const lastMessageId = messages.at(-1)?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, []);

  useEffect(() => {
    if (!lastMessageId) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lastMessageId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    send({ type: "send_chat", text: trimmed });
    setText("");
  }

  return (
    <section className="bg-gray-800 rounded-xl p-4 flex h-80 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white">チャット</h2>
        <span className="text-xs text-gray-500">{messages.length}/100</span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="pt-8 text-center text-sm text-gray-500">
            まだメッセージはありません
          </p>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isMine={message.playerId === myPlayerId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={text}
          maxLength={300}
          onChange={(event) => setText(event.target.value)}
          placeholder="メッセージ"
          className="min-w-0 flex-1 rounded-lg bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="送信"
          title="送信"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
        >
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}
