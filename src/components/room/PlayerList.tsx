import type { BuzzEntry, Player, RoomState } from "../../party/types";

interface Props {
  players: Player[];
  hostId: string | null;
  buzzes?: BuzzEntry[];
  state?: RoomState;
}

export function PlayerList({ players, hostId, buzzes = [], state }: Props) {
  const buzzIndex = Object.fromEntries(buzzes.map((b, i) => [b.playerId, i]));
  const isMonBatsu = state?.ruleType === "mon_batsu";

  return (
    <ul className="space-y-2">
      {players.map((p) => {
        const rank = buzzIndex[p.id];
        const hasBuzzed = rank !== undefined;
        return (
          <li
            key={p.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              p.isEliminated
                ? "bg-red-900/30 text-gray-500"
                : p.hasWon
                  ? "bg-yellow-500/20 text-yellow-300"
                  : rank === 0
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
              {p.hasWon && <span>🏆</span>}
              {hasBuzzed && !p.isEliminated && !p.hasWon && (
                <span className={`text-xs rounded px-1 ${rank === 0 ? "bg-black/20" : "bg-white/20"}`}>
                  {rank + 1}位
                </span>
              )}
              {p.name}
            </span>
            {isMonBatsu ? (
              <span className="font-mono text-xs whitespace-nowrap">
                <span className="text-green-400">○{p.correctCount}</span>
                {" "}
                <span className="text-red-400">×{p.incorrectCount}</span>
              </span>
            ) : (
              <span className="font-bold">{p.score}pt</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
