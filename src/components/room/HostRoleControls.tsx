import { Crown, LogOut } from "lucide-react";
import type { ClientMessage, RoomState } from "../../party/types";

interface Props {
	state: RoomState;
	isHost: boolean;
	myPlayerId: string | null;
	send: (msg: ClientMessage) => void;
}

function canChangeHost(state: RoomState): boolean {
	return (
		state.phase === "lobby" ||
		state.phase === "waiting" ||
		state.phase === "result" ||
		state.phase === "finished"
	);
}

export function HostRoleControls({ state, isHost, myPlayerId, send }: Props) {
	if (!myPlayerId || !canChangeHost(state)) return null;

	if (isHost) {
		return (
			<section className="bg-gray-800 rounded-xl p-4">
				<button
					type="button"
					onClick={() => send({ type: "leave_host" })}
					className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-sm font-bold text-gray-200 transition-colors hover:bg-gray-600"
				>
					<LogOut size={16} />
					ホストを抜ける
				</button>
			</section>
		);
	}

	if (state.hostId !== null) return null;

	return (
		<section className="bg-gray-800 rounded-xl p-4 space-y-2">
			<p className="text-xs text-gray-400">現在ホストはいません</p>
			<button
				type="button"
				onClick={() => send({ type: "claim_host" })}
				className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-500"
			>
				<Crown size={16} />
				ホストになる
			</button>
		</section>
	);
}
