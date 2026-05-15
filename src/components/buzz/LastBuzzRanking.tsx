import type { BuzzEntry, Player, PlayerId } from "../../party/types";
import { BuzzRankingItem } from "./BuzzRankingItem";

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
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="space-y-1">
        {buzzes.map((b, i) => (
          <BuzzRankingItem
            key={b.playerId}
            buzz={b}
            players={players}
            rank={i}
            firstAt={firstAt}
          />
        ))}
      </div>
    </div>
  );
}
