import { createFileRoute, useNavigate } from "@tanstack/react-router";
import usePartySocket from "partysocket/react";
import { type FormEvent, useCallback, useState } from "react";
import { BoardPanel } from "../components/board/BoardPanel";
import { ChatPanel } from "../components/chat/ChatPanel";
import { HostControls } from "../components/host/HostControls";
import { HostRoleControls } from "../components/host/HostRoleControls";
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
import type { ServerMessage } from "../party/types";

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

function ActiveRoomPage({ roomId, name }: { roomId: string; name: string }) {
  const onServerMessage = useSoundEffects();
  const { roomState, sendMessage, myPlayerId, isHost, errorMessage } =
    useQuizRoom(roomId, name, onServerMessage);

  const onBuzz = useCallback(
    () => sendMessage({ type: "buzz" }),
    [sendMessage],
  );
  useKeyboardBuzz(onBuzz);

  if (!roomState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <p>接続中...</p>
      </div>
    );
  }

  const players = Object.values(roomState.players);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg">早押しボード</h1>
        <div className="text-sm text-gray-400">
          ルーム: <span className="text-white font-mono">{roomId}</span>
          {isHost && (
            <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
              ホスト
            </span>
          )}
        </div>
        <SettingsButton />
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6 lg:flex-row">
        <main className="flex-1 min-w-0">
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-500/60 bg-red-950/50 px-4 py-3 text-sm font-bold text-red-200">
              {errorMessage}
            </div>
          )}
          {roomState.phase === "lobby" && (
            <LobbyPhase
              state={roomState}
              roomId={roomId}
              isHost={isHost}
              send={sendMessage}
            />
          )}
          {roomState.phase === "waiting" && (
            <WaitingRoom state={roomState} roomId={roomId} />
          )}
          {roomState.phase === "question" && (
            <QuestionPhase
              state={roomState}
              onBuzz={onBuzz}
              isHost={isHost}
              myPlayerId={myPlayerId}
            />
          )}
          {roomState.phase === "buzzed" && (
            <BuzzedPhase
              state={roomState}
              myPlayerId={myPlayerId}
              onBuzz={onBuzz}
              isHost={isHost}
            />
          )}
          {roomState.phase === "result" && <ResultPhase state={roomState} />}
          {roomState.phase === "finished" && (
            <FinishedPhase
              players={players}
              state={roomState}
              isHost={isHost}
              send={sendMessage}
            />
          )}
        </main>

        <aside className="w-full shrink-0 space-y-4 lg:w-64">
          <Scoreboard
            players={players}
            hostId={roomState.hostId}
            state={roomState}
            isHost={isHost}
            send={sendMessage}
          />
          {isHost && <HostControls state={roomState} send={sendMessage} />}
          <HostRoleControls
            state={roomState}
            isHost={isHost}
            myPlayerId={myPlayerId}
            send={sendMessage}
          />
          <BoardPanel
            state={roomState}
            myPlayerId={myPlayerId}
            send={sendMessage}
          />
          <ChatPanel
            state={roomState}
            myPlayerId={myPlayerId}
            send={sendMessage}
          />
        </aside>
      </div>
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 text-white">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-black text-center mb-2">ルームに参加</h1>
        <p className="text-gray-400 text-center mb-1 text-sm">
          ルーム: <span className="font-mono text-white">{roomId}</span>
        </p>
        <p className="text-gray-500 text-center mb-8 text-sm">
          {playerCount === null
            ? "接続中..."
            : `現在 ${playerCount} 人が参加中`}
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label
              htmlFor="join-player-name"
              className="block text-sm text-gray-400 mb-1"
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
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            参加する
          </button>
        </form>
      </div>
    </div>
  );
}
