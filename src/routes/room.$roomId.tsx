import { createFileRoute, redirect } from "@tanstack/react-router";
import { BuzzedPhase } from "../components/room/BuzzedPhase";
import { ChatPanel } from "../components/room/ChatPanel";
import { FinishedPhase } from "../components/room/FinishedPhase";
import { HostControls } from "../components/room/HostControls";
import { HostRoleControls } from "../components/room/HostRoleControls";
import { LobbyPhase } from "../components/room/LobbyPhase";
import { QuestionPhase } from "../components/room/QuestionPhase";
import { ResultPhase } from "../components/room/ResultPhase";
import { Scoreboard } from "../components/room/Scoreboard";
import { WaitingRoom } from "../components/room/WaitingRoom";
import { useQuizRoom } from "../hooks/useQuizRoom";

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
	const { roomState, sendMessage, myPlayerId, isHost, errorMessage } =
		useQuizRoom(roomId, name);

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
					/>
					{isHost && <HostControls state={roomState} send={sendMessage} />}
					<HostRoleControls
						state={roomState}
						isHost={isHost}
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
