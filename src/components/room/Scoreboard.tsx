import type { Player, RoomState } from "../../party/types";

interface Props {
  players: Player[];
  hostId: string | null;
  state: RoomState;
}

export function Scoreboard({ players, hostId, state }: Props) {
  const { ruleType, winCount, eliminateCount } = state;
  const isMonBatsu = ruleType === "mon_batsu";

  const sorted = [...players].sort((a, b) => {
    if (a.hasWon !== b.hasWon) return a.hasWon ? -1 : 1;
    if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
    return b.correctCount - a.correctCount;
  });

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h2 className="text-lg font-bold mb-1 text-white">スコア</h2>
      {isMonBatsu && (
        <p className="text-xs text-gray-400 mb-3">{winCount}○ {eliminateCount}×</p>
      )}
      <ol className="space-y-2">
        {sorted.map((p) => (
          <li
            key={p.id}
            className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1 ${
              p.hasWon
                ? "bg-yellow-500/20 text-yellow-300"
                : p.isEliminated
                  ? "bg-red-900/30 text-gray-500 line-through"
                  : "text-white"
            }`}
          >
            <span className="flex-1 truncate">
              {hostId === p.id && (
                <span className="text-xs bg-blue-600 text-white rounded px-1 mr-1 no-underline" style={{ textDecoration: "none" }}>ホスト</span>
              )}
              {p.hasWon && <span className="mr-1">🏆</span>}
              {p.name}
            </span>
            {isMonBatsu ? (
              <span className="font-mono text-xs whitespace-nowrap">
                <span className="text-green-400">○{p.correctCount}</span>
                {" "}
                <span className="text-red-400">×{p.incorrectCount}</span>
              </span>
            ) : (
              <span className="font-bold text-yellow-400">{p.score}pt</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
