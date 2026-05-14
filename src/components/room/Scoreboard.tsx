import type { Player, RoomState } from "../../party/types";

interface Props {
  players: Player[];
  hostId: string | null;
  state: RoomState;
}

function playerStatus(p: Player, state: RoomState): string | null {
  if (p.hasWon) return "🏆 勝ち抜け";
  if (p.isEliminated) return "✗ 失格";
  if (state.ruleType === "mon_kyu" && state.currentQuestionIndex <= p.suspendedUntilQuestion) {
    const remaining = p.suspendedUntilQuestion - state.currentQuestionIndex + 1;
    return `💤 休み（あと${remaining}問）`;
  }
  return null;
}

function ScoreDisplay({ p, state }: { p: Player; state: RoomState }) {
  switch (state.ruleType) {
    case "mon_batsu":
    case "mon_kyu":
      return (
        <span className="font-mono text-xs whitespace-nowrap">
          <span className="text-green-400">○{p.correctCount}</span>
          {" "}
          <span className="text-red-400">×{p.incorrectCount}</span>
        </span>
      );
    case "nbn":
      return (
        <span className="font-mono text-xs whitespace-nowrap">
          <span className="text-green-400">○{p.correctCount}</span>
          {" "}
          <span className="text-red-400">×{p.incorrectCount}</span>
        </span>
      );
    case "points":
    case "simple":
    default:
      return (
        <span className="font-bold text-yellow-400">{p.score}pt</span>
      );
  }
}

export function Scoreboard({ players, hostId, state }: Props) {
  const { ruleType } = state;

  const sorted = [...players].sort((a, b) => {
    if (a.hasWon !== b.hasWon) return a.hasWon ? -1 : 1;
    if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
    return b.correctCount - a.correctCount || b.score - a.score;
  });

  const ruleLabel: Record<typeof ruleType, string> = {
    simple: "",
    mon_batsu: `${state.winCount}○${state.eliminateCount}×`,
    mon_kyu: `${state.winCount}○${state.eliminateCount}休`,
    nbn: `${state.nbyN}byN`,
    points: `+${state.addPoints}/-${state.subtractPoints} ${state.winPoints}pt`,
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h2 className="text-lg font-bold mb-1 text-white">スコア</h2>
      {ruleLabel[ruleType] && (
        <p className="text-xs text-gray-400 mb-3">{ruleLabel[ruleType]}</p>
      )}
      <ol className="space-y-2">
        {sorted.map((p) => {
          const status = playerStatus(p, state);
          return (
            <li
              key={p.id}
              className={`flex flex-col rounded-lg px-2 py-1 text-sm ${
                p.hasWon
                  ? "bg-yellow-500/20 text-yellow-300"
                  : p.isEliminated
                    ? "bg-red-900/30 text-gray-500"
                    : "text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate">
                  {hostId === p.id && (
                    <span className="text-xs bg-blue-600 text-white rounded px-1 mr-1">ホスト</span>
                  )}
                  {p.name}
                </span>
                <ScoreDisplay p={p} state={state} />
              </div>
              {status && (
                <span className="text-xs text-gray-400 mt-0.5">{status}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
