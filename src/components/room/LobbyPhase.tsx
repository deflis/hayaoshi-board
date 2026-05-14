import type { ClientMessage, RoomState } from "../../party/types";
import { PlayerList } from "./PlayerList";

interface Props {
	state: RoomState;
	roomId: string;
	isHost: boolean;
	send: (msg: ClientMessage) => void;
}

const RULE_LABELS = {
	simple: "シンプル（+1pt）",
	mon_batsu: `m○n×`,
	mon_kyu: `m○n休`,
	nbn: "NbyN",
	points: "+N/-M",
} as const;

const TRANSITION_LABELS = {
	single_chance: "シングルチャンス",
	endless_chance: "エンドレスチャンス",
	second_chance: "2着切り",
	all_order: "全順回答",
} as const;

function ruleSummary(state: RoomState): string {
	const r = state.ruleType;
	const t = TRANSITION_LABELS[state.answerTransition];
	switch (r) {
		case "mon_batsu":
			return `${state.winCount}○${state.eliminateCount}× ／ ${t}`;
		case "mon_kyu":
			return `${state.winCount}○${state.eliminateCount}休 ／ ${t}`;
		case "nbn":
			return `${state.nbyN}byN ／ ${t}`;
		case "points":
			return `+${state.addPoints}/-${state.subtractPoints} ${state.winPoints}pt ／ ${t}`;
		default:
			return `シンプル ／ ${t}`;
	}
}

export function LobbyPhase({ state, roomId, isHost, send }: Props) {
	const url =
		typeof window !== "undefined"
			? `${window.location.origin}/room/${roomId}`
			: "";

	const players = Object.values(state.players);
	const canStart = players.length >= 1;

	return (
		<div className="space-y-6 text-white">
			<div>
				<h2 className="text-2xl font-bold mb-1">ロビー</h2>
				<p className="text-gray-400 text-sm">
					ルームID: <span className="font-mono">{roomId}</span>
				</p>
			</div>

			{url && (
				<div className="bg-gray-700 rounded-lg p-3">
					<p className="text-xs text-gray-400 mb-1">招待URL</p>
					<p className="text-sm break-all">{url}</p>
					<button
						type="button"
						onClick={() => navigator.clipboard.writeText(url)}
						className="mt-2 text-xs bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded transition-colors"
					>
						コピー
					</button>
				</div>
			)}

			<div>
				<p className="text-sm text-gray-400 mb-2">
					参加者 ({players.length}人)
				</p>
				<PlayerList players={players} hostId={state.hostId} state={state} />
			</div>

			<div className="bg-gray-700 rounded-lg p-3 text-sm">
				<p className="text-xs text-gray-400 mb-1">ルール</p>
				<p className="font-bold">{RULE_LABELS[state.ruleType]}</p>
				<p className="text-gray-400 text-xs mt-0.5">{ruleSummary(state)}</p>
			</div>

			{isHost ? (
				<button
					type="button"
					disabled={!canStart}
					onClick={() => send({ type: "start_game" })}
					className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-black text-xl py-4 rounded-xl transition-colors shadow-lg"
				>
					ゲームスタート
				</button>
			) : (
				<p className="text-gray-500 text-sm text-center">
					ホストがゲームを開始するまでお待ちください
				</p>
			)}
		</div>
	);
}
