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
          ? "bg-yellow-50 text-yellow-700"
          : "bg-gray-100 text-gray-500"
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
