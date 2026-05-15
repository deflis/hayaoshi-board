import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageCircle, SlidersHorizontal } from "lucide-react";
import usePartySocket from "partysocket/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { BoardPanel } from "../components/board/BoardPanel";
import { ChatPanel } from "../components/chat/ChatPanel";
import { ContextActionBar } from "../components/host/ContextActionBar";
import { HostRoleControls } from "../components/host/HostRoleControls";
import { RuleSettingsModal } from "../components/host/RuleSettingsModal";
import { BuzzedPhase } from "../components/phase/BuzzedPhase";
import { FinishedPhase } from "../components/phase/FinishedPhase";
import { LobbyPhase } from "../components/phase/LobbyPhase";
import { QuestionPhase } from "../components/phase/QuestionPhase";
import { ResultPhase } from "../components/phase/ResultPhase";
import { WaitingRoom } from "../components/phase/WaitingRoom";
import { Scoreboard } from "../components/player/Scoreboard";
import { SettingsButton } from "../components/settings/SettingsButton";
import { useKeyboardBuzz } from "../hooks/useKeyboardBuzz";
import { useQuizRoom } from "../hooks/useQuizRoom";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { ruleShortLabel } from "../lib/ruleSummary";
import type { RoomPhase, RoomState, ServerMessage } from "../party/types";

export const Route = createFileRoute("/room/$roomId")({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === "string" ? search.name : "",
  }),
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const { name } = Route.useSearch();
  if (!name) return <JoinRoomPage roomId={roomId} />;

  return <ActiveRoomPage roomId={roomId} name={name} />;
}

function phaseLabel(phase: RoomPhase, state: RoomState): string {
  switch (phase) {
    case "lobby":
      return "ロビー";
    case "waiting":
      return "待機中";
    case "question":
      return `問題 ${state.currentQuestionIndex} / ${state.totalQuestions}`;
    case "buzzed":
      return "判定中";
    case "result":
      return "結果";
    case "finished":
      return "終了";
  }
}

function phaseChipStyle(phase: RoomPhase): string {
  switch (phase) {
    case "lobby":
      return "bg-gray-100 text-gray-600";
    case "waiting":
      return "bg-blue-100 text-blue-700";
    case "question":
      return "bg-green-100 text-green-700";
    case "buzzed":
      return "bg-yellow-100 text-yellow-700";
    case "result":
      return "bg-indigo-100 text-indigo-700";
    case "finished":
      return "bg-purple-100 text-purple-700";
  }
}

const CHAT_OPEN_KEY = "hayaoshi-chat-open";

function ActiveRoomPage({ roomId, name }: { roomId: string; name: string }) {
  const onServerMessage = useSoundEffects();
  const { roomState, sendMessage, myPlayerId, isHost, errorMessage } =
    useQuizRoom(roomId, name, onServerMessage);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(CHAT_OPEN_KEY);
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(CHAT_OPEN_KEY, String(chatOpen));
  }, [chatOpen]);

  const onBuzz = useCallback(
    () => sendMessage({ type: "buzz" }),
    [sendMessage],
  );
  useKeyboardBuzz(onBuzz);

  if (!roomState) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <p className="text-gray-600">接続中...</p>
      </div>
    );
  }

  const players = Object.values(roomState.players);
  const { phase } = roomState;

  const canOpenRuleSettings =
    isHost &&
    (phase === "lobby" ||
      phase === "waiting" ||
      phase === "result" ||
      phase === "finished");

  const showScoreboard = phase !== "finished";

  return (
    <div className="h-screen bg-[#f8f9ff] text-gray-900 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <h1 className="font-black text-lg text-gray-900 shrink-0">
          早押しボード
        </h1>

        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          {roomState && (
            <>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${phaseChipStyle(phase)}`}
              >
                {phaseLabel(phase, roomState)}
              </span>
              {phase !== "lobby" && (
                <span className="text-xs text-gray-400 font-mono hidden sm:block truncate">
                  {ruleShortLabel(roomState)}
                </span>
              )}
            </>
          )}
          <span className="text-xs text-gray-400 hidden md:block">
            ルーム: <span className="font-mono text-gray-600">{roomId}</span>
          </span>
          {isHost && (
            <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded shrink-0">
              ホスト
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            className={`transition-colors ${chatOpen ? "text-indigo-600 hover:text-indigo-400" : "text-gray-400 hover:text-gray-700"}`}
            title={chatOpen ? "チャットを隠す" : "チャットを表示"}
          >
            <MessageCircle size={20} />
          </button>
          {canOpenRuleSettings && (
            <button
              type="button"
              onClick={() => setRuleModalOpen(true)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              title="ルール設定"
            >
              <SlidersHorizontal size={20} />
            </button>
          )}
          <SettingsButton />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左ペイン: チャット（折りたたみ可） */}
        <aside
          className={`shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden transition-all duration-200 ${
            chatOpen ? "w-72" : "w-0 border-r-0"
          }`}
        >
          <ChatPanel
            state={roomState}
            myPlayerId={myPlayerId}
            send={sendMessage}
          />
        </aside>

        {/* 中央ペイン: メインコンテンツ */}
        <main className="flex-1 min-w-0 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {errorMessage}
            </div>
          )}

          {showScoreboard && (
            <Scoreboard
              players={players}
              hostId={roomState.hostId}
              state={roomState}
              isHost={isHost}
              send={sendMessage}
            />
          )}

          {phase === "lobby" && (
            <LobbyPhase
              state={roomState}
              roomId={roomId}
              isHost={isHost}
              send={sendMessage}
              onOpenRuleSettings={
                canOpenRuleSettings ? () => setRuleModalOpen(true) : undefined
              }
            />
          )}
          {phase === "waiting" && (
            <WaitingRoom state={roomState} roomId={roomId} />
          )}
          {phase === "question" && (
            <QuestionPhase
              state={roomState}
              onBuzz={onBuzz}
              isHost={isHost}
              myPlayerId={myPlayerId}
            />
          )}
          {phase === "buzzed" && (
            <BuzzedPhase
              state={roomState}
              myPlayerId={myPlayerId}
              onBuzz={onBuzz}
              isHost={isHost}
            />
          )}
          {phase === "result" && <ResultPhase state={roomState} />}
          {phase === "finished" && (
            <FinishedPhase
              players={players}
              state={roomState}
              isHost={isHost}
              send={sendMessage}
            />
          )}

          {roomState.boardEnabled && (
            <BoardPanel
              state={roomState}
              myPlayerId={myPlayerId}
              send={sendMessage}
            />
          )}

          <HostRoleControls
            state={roomState}
            isHost={isHost}
            myPlayerId={myPlayerId}
            send={sendMessage}
          />
        </main>
      </div>

      {/* 下部アクションバー */}
      <div className="shrink-0 border-t border-gray-200 bg-white">
        <ContextActionBar
          state={roomState}
          isHost={isHost}
          myPlayerId={myPlayerId}
          onBuzz={onBuzz}
          send={sendMessage}
        />
      </div>

      {ruleModalOpen && (
        <RuleSettingsModal
          state={roomState}
          send={sendMessage}
          onClose={() => setRuleModalOpen(false)}
          isHost={isHost}
        />
      )}
    </div>
  );
}

function JoinRoomPage({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  usePartySocket({
    host:
      typeof window !== "undefined" ? window.location.host : "localhost:3000",
    party: "quiz-room",
    room: roomId,
    onMessage(event: MessageEvent) {
      const msg = JSON.parse(event.data as string) as ServerMessage;
      if (msg.type === "room_state") {
        setPlayerCount(Object.keys(msg.state.players).length);
      }
    },
  });

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    const playerName = name.trim();
    if (!playerName) return;
    navigate({
      to: "/room/$roomId",
      params: { roomId },
      search: { name: playerName },
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-black text-gray-900 text-center mb-2">
          ルームに参加
        </h1>
        <p className="text-gray-500 text-center mb-1 text-sm">
          ルーム: <span className="font-mono text-gray-900">{roomId}</span>
        </p>
        <p className="text-gray-400 text-center mb-8 text-sm">
          {playerCount === null
            ? "接続中..."
            : `現在 ${playerCount} 人が参加中`}
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label
              htmlFor="join-player-name"
              className="block text-sm text-gray-600 mb-1"
            >
              プレイヤー名
            </label>
            <input
              id="join-player-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前を入力"
              required
              className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            参加する
          </button>
        </form>
      </div>
    </div>
  );
}
