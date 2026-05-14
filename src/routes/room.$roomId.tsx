import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuizRoom } from "../hooks/useQuizRoom";
import { LobbyPhase } from "../components/room/LobbyPhase";
import { WaitingRoom } from "../components/room/WaitingRoom";
import { QuestionPhase } from "../components/room/QuestionPhase";
import { BuzzedPhase } from "../components/room/BuzzedPhase";
import { ResultPhase } from "../components/room/ResultPhase";
import { FinishedPhase } from "../components/room/FinishedPhase";
import { Scoreboard } from "../components/room/Scoreboard";
import { HostControls } from "../components/room/HostControls";

export const Route = createFileRoute("/room/$roomId")({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === "string" ? search.name : "",
  }),
  beforeLoad({ search }) {
    if (!search.name) {
      throw redirect({ to: "/" });
    }
  },
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const { name } = Route.useSearch();
  const { roomState, sendMessage, myPlayerId, isHost } = useQuizRoom(roomId, name);

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
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 flex gap-6">
        <main className="flex-1 min-w-0">
          {roomState.phase === "lobby" && (
            <LobbyPhase state={roomState} roomId={roomId} isHost={isHost} send={sendMessage} />
          )}
          {roomState.phase === "waiting" && (
            <WaitingRoom state={roomState} roomId={roomId} />
          )}
          {roomState.phase === "question" && (
            <QuestionPhase
              state={roomState}
              onBuzz={() => sendMessage({ type: "buzz" })}
              isHost={isHost}
              myPlayerId={myPlayerId}
            />
          )}
          {roomState.phase === "buzzed" && (
            <BuzzedPhase
              state={roomState}
              myPlayerId={myPlayerId}
              onBuzz={() => sendMessage({ type: "buzz" })}
              isHost={isHost}
            />
          )}
          {roomState.phase === "result" && (
            <ResultPhase state={roomState} />
          )}
          {roomState.phase === "finished" && (
            <FinishedPhase players={players} state={roomState} isHost={isHost} send={sendMessage} />
          )}
        </main>

        <aside className="w-56 shrink-0 space-y-4">
          <Scoreboard players={players} hostId={roomState.hostId} state={roomState} />
          {isHost && (
            <HostControls state={roomState} send={sendMessage} />
          )}
        </aside>
      </div>
    </div>
  );
}
