import type { BuzzEntry, Player, PlayerId } from "../../party/types";

interface Props {
	buzzes: BuzzEntry[];
	players: Record<PlayerId, Player>;
	label?: string;
}

export function LastBuzzRanking({ buzzes, players, label = "着順" }: Props) {
	if (buzzes.length === 0) return null;
	const firstAt = buzzes[0].buzzedAt;

	return (
		<div className="w-full max-w-md">
			<p className="text-xs text-gray-500 mb-1">{label}</p>
			<div className="space-y-1">
				{buzzes.map((b, i) => {
					const player = players[b.playerId];
					const diffMs = b.buzzedAt - firstAt;
					return (
						<div
							key={b.playerId}
							className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
								i === 0
									? "bg-yellow-500/20 text-yellow-300"
									: "bg-gray-700/50 text-gray-400"
							}`}
						>
							<span className="w-5 text-center font-bold">{i + 1}</span>
							<span className="flex-1">{player?.name ?? "?"}</span>
							<span className="font-mono text-xs">
								{i === 0 ? "基準" : `+${diffMs}ms`}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
