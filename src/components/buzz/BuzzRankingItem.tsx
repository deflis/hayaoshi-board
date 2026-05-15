import type { BuzzEntry, Player, PlayerId } from "../../party/types";

interface Props {
  buzz: BuzzEntry;
  players: Record<PlayerId, Player>;
  rank: number;
  firstAt: number;
}

export function BuzzRankingItem({ buzz, players, rank, firstAt }: Props) {
  const player = players[buzz.playerId];
  const diffMs = buzz.buzzedAt - firstAt;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
        rank === 0
          ? "bg-yellow-500/20 text-yellow-300"
          : "bg-gray-700/50 text-gray-400"
      }`}
    >
      <span className="w-5 text-center font-bold">{rank + 1}</span>
      <span className="flex-1">{player?.name ?? "?"}</span>
      <span className="font-mono text-xs">
        {rank === 0 ? "基準" : `+${diffMs}ms`}
      </span>
    </div>
  );
}
