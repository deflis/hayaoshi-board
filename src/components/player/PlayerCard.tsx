import type { Player, RoomState } from "../../party/types";

interface Props {
  player: Player;
  hostId: string | null;
  buzzIndex: Record<string, number>;
  state?: RoomState;
  showScore?: boolean;
}

export function PlayerCard({
  player,
  hostId,
  buzzIndex,
  state,
  showScore = true,
}: Props) {
  const rank = buzzIndex[player.id];
  const hasBuzzed = rank !== undefined;
  const isMonBatsu = state?.ruleType === "mon_batsu";

  return (
    <li
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
        player.isEliminated
          ? "bg-red-50 text-gray-400"
          : player.hasWon
            ? "bg-yellow-50 text-yellow-700"
            : rank === 0
              ? "bg-yellow-400 text-gray-900 font-bold"
              : hasBuzzed
                ? "bg-indigo-100 text-indigo-800"
                : "bg-gray-100 text-gray-900"
      }`}
    >
      <span className="flex items-center gap-2">
        {hostId === player.id && (
          <span className="text-xs bg-indigo-600 text-white rounded px-1">
            ホスト
          </span>
        )}
        {player.hasWon && <span>🏆</span>}
        {hasBuzzed && !player.isEliminated && !player.hasWon && (
          <span
            className={`text-xs rounded px-1 ${rank === 0 ? "bg-black/10" : "bg-indigo-600/20"}`}
          >
            {rank + 1}位
          </span>
        )}
        {player.name}
      </span>
      {showScore &&
        (isMonBatsu ? (
          <span className="font-mono text-xs whitespace-nowrap">
            <span className="text-green-600">○{player.correctCount}</span>{" "}
            <span className="text-red-600">×{player.incorrectCount}</span>
          </span>
        ) : (
          <span className="font-bold">{player.score}pt</span>
        ))}
    </li>
  );
}
