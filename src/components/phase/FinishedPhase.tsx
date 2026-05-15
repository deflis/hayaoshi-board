import type { ClientMessage, Player, RoomState } from "../../party/types";

interface Props {
  players: Player[];
  state: RoomState;
  isHost: boolean;
  send: (msg: ClientMessage) => void;
}

export function FinishedPhase({ players, state }: Props) {
  const isMonBatsu = state.ruleType !== "simple" && state.ruleType !== "points";

  const sorted = [...players].sort((a, b) => {
    if (a.hasWon !== b.hasWon) return a.hasWon ? -1 : 1;
    if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
    return b.correctCount - a.correctCount || b.score - a.score;
  });

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-gray-900">
      <h2 className="text-3xl font-black">ゲーム終了！</h2>

      <div className="w-full max-w-sm space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
              p.hasWon
                ? "bg-yellow-400 text-gray-900 font-black text-xl"
                : p.isEliminated
                  ? "bg-gray-100 text-gray-400"
                  : i === 0
                    ? "bg-yellow-400 text-gray-900 text-xl font-black"
                    : i === 1
                      ? "bg-gray-200 text-gray-800 text-lg font-bold"
                      : i === 2
                        ? "bg-orange-500 text-white text-base font-bold"
                        : "bg-gray-100 text-gray-900"
            }`}
          >
            <span className="w-8 text-center">
              {p.hasWon ? "🏆" : p.isEliminated ? "✗" : `${i + 1}位`}
            </span>
            <span className="flex-1">{p.name}</span>
            {isMonBatsu ? (
              <span className="font-mono text-sm">
                <span className="text-green-600">○{p.correctCount}</span>{" "}
                <span className="text-red-600">×{p.incorrectCount}</span>
              </span>
            ) : (
              <span>{p.score}pt</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
