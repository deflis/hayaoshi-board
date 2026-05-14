import type { BuzzEntry, Player } from "../../party/types";

interface Props {
  players: Player[];
  hostId: string | null;
  buzzes?: BuzzEntry[];
}

export function PlayerList({ players, hostId, buzzes = [] }: Props) {
  const buzzIndex = Object.fromEntries(buzzes.map((b, i) => [b.playerId, i]));

  return (
    <ul className="space-y-2">
      {players.map((p) => {
        const rank = buzzIndex[p.id];
        const hasBuzzed = rank !== undefined;
        return (
          <li
            key={p.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              rank === 0
                ? "bg-yellow-500 text-black font-bold"
                : hasBuzzed
                  ? "bg-blue-700 text-white"
                  : "bg-gray-700 text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              {hostId === p.id && (
                <span className="text-xs bg-blue-600 text-white rounded px-1">ホスト</span>
              )}
              {hasBuzzed && (
                <span className={`text-xs rounded px-1 ${rank === 0 ? "bg-black/20" : "bg-white/20"}`}>
                  {rank + 1}位
                </span>
              )}
              {p.name}
            </span>
            <span className="font-bold">{p.score}pt</span>
          </li>
        );
      })}
    </ul>
  );
}
