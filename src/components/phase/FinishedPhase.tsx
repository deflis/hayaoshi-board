import type { ClientMessage, Player, RoomState } from "../../party/types";

interface Props {
  players: Player[];
  state: RoomState;
  isHost: boolean;
  send: (msg: ClientMessage) => void;
}

export function FinishedPhase({ players, state, isHost, send }: Props) {
  const isMonBatsu = state.ruleType !== "simple" && state.ruleType !== "points";
  const winners = Object.values(state.players).filter((p) => p.hasWon);
  const hasActivePlayer =
    (state.maxWinners === 0 || winners.length < state.maxWinners) &&
    Object.values(state.players).some((p) => !p.hasWon && !p.isEliminated);

  const sorted = [...players].sort((a, b) => {
    if (a.hasWon !== b.hasWon) return a.hasWon ? -1 : 1;
    if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
    return b.correctCount - a.correctCount || b.score - a.score;
  });

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-white">
      <h2 className="text-3xl font-black">ゲーム終了！</h2>

      <div className="w-full max-w-sm space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
              p.hasWon
                ? "bg-yellow-500 text-black font-black text-xl"
                : p.isEliminated
                  ? "bg-gray-700 text-gray-500"
                  : i === 0
                    ? "bg-yellow-500 text-black text-xl font-black"
                    : i === 1
                      ? "bg-gray-300 text-black text-lg font-bold"
                      : i === 2
                        ? "bg-orange-600 text-white text-base font-bold"
                        : "bg-gray-700 text-white"
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

      {isHost && (
        <div className="mt-4 flex flex-col gap-3 w-full max-w-sm">
          {hasActivePlayer && (
            <button
              type="button"
              onClick={() => send({ type: "resume_game" })}
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              続きから再開
            </button>
          )}
          <button
            type="button"
            onClick={() => send({ type: "restart_game" })}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
          >
            スコアリセットしてもう1回
          </button>
        </div>
      )}
    </div>
  );
}
