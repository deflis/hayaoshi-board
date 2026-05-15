import type { ClientMessage, Player, RoomState } from "../../party/types";

interface Props {
  players: Player[];
  state: RoomState;
  isHost: boolean;
  send: (msg: ClientMessage) => void;
}

export function FinishedPhase({ players, state }: Props) {
  const isMonBatsu = state.ruleType !== "simple" && state.ruleType !== "points";
  const isPoints = state.ruleType === "points";

  const sorted = [...players].sort((a, b) => {
    if (a.hasWon !== b.hasWon) return a.hasWon ? -1 : 1;
    if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
    return b.correctCount - a.correctCount || b.score - a.score;
  });

  const rankStyle = (i: number, p: Player) => {
    if (p.hasWon) return "bg-yellow-400 text-gray-900 font-black text-xl";
    if (p.isEliminated) return "bg-gray-100 text-gray-400";
    if (i === 0) return "bg-yellow-400 text-gray-900 text-xl font-black";
    if (i === 1) return "bg-gray-200 text-gray-800 text-lg font-bold";
    if (i === 2) return "bg-orange-500 text-white text-base font-bold";
    return "bg-gray-100 text-gray-900";
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-gray-900">
      <h2 className="text-3xl font-black">ゲーム終了！</h2>

      <div className="w-full max-w-2xl space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 rounded-xl px-5 py-3 ${rankStyle(i, p)}`}
          >
            <span className="w-10 text-center shrink-0">
              {p.hasWon ? "🏆" : p.isEliminated ? "✗" : `${i + 1}位`}
            </span>
            <span className="flex-1 min-w-0 truncate">{p.name}</span>
            {isMonBatsu ? (
              <span className="font-mono text-sm whitespace-nowrap">
                <span className="text-green-700">○{p.correctCount}</span>{" "}
                <span className="text-red-700">×{p.incorrectCount}</span>
              </span>
            ) : isPoints ? (
              <span className="font-mono text-sm whitespace-nowrap">
                <span className="text-green-700">○{p.correctCount}</span>{" "}
                <span className="text-red-700">×{p.incorrectCount}</span>{" "}
                <span className="font-bold">{p.score}pt</span>
              </span>
            ) : (
              <span className="font-bold whitespace-nowrap">{p.score}pt</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
