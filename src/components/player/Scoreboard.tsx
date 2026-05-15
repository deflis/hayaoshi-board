import type { ClientMessage, Player, RoomState } from "../../party/types";
import { ScoreDisplay } from "./ScoreDisplay";
import { ScoreEditor } from "./ScoreEditor";

interface Props {
  players: Player[];
  hostId: string | null;
  state: RoomState;
  isHost?: boolean;
  send?: (msg: ClientMessage) => void;
}

function playerStatus(p: Player, state: RoomState): string | null {
  if (p.hasWon) return "🏆 勝ち抜け";
  if (p.isEliminated) return "✗ 失格";
  if (
    state.ruleType === "mon_kyu" &&
    state.currentQuestionIndex <= p.suspendedUntilQuestion
  ) {
    const remaining = p.suspendedUntilQuestion - state.currentQuestionIndex + 1;
    return `💤 休み（あと${remaining}問）`;
  }
  return null;
}

export function Scoreboard({ players, hostId, state, isHost, send }: Props) {
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
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-bold mb-1 text-gray-900">スコア</h2>
      {ruleLabel[ruleType] && (
        <p className="text-xs text-gray-500 mb-3">{ruleLabel[ruleType]}</p>
      )}
      <ol className="space-y-2">
        {sorted.map((p) => {
          const status = playerStatus(p, state);
          return (
            <li
              key={p.id}
              className={`flex flex-col rounded-lg px-2 py-1 text-sm ${
                p.hasWon
                  ? "bg-yellow-50 text-yellow-700"
                  : p.isEliminated
                    ? "bg-red-50 text-gray-400"
                    : "text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate">
                  {hostId === p.id && (
                    <span className="text-xs bg-indigo-600 text-white rounded px-1 mr-1">
                      ホスト
                    </span>
                  )}
                  {p.name}
                </span>
                {isHost && send ? (
                  <ScoreEditor player={p} state={state} send={send} />
                ) : (
                  <ScoreDisplay player={p} ruleType={ruleType} />
                )}
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
