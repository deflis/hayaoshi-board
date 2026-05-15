import type {
  BuzzEntry,
  ClientMessage,
  Player,
  RoomPhase,
  RoomState,
} from "../../party/types";
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

function buzzRank(playerId: string, buzzes: BuzzEntry[]): number | null {
  const idx = buzzes.findIndex((b) => b.playerId === playerId);
  return idx >= 0 ? idx + 1 : null;
}

const isLobbyPhase = (phase: RoomPhase) => phase === "lobby";
const isBuzzPhase = (phase: RoomPhase) =>
  phase === "question" || phase === "buzzed";

export function Scoreboard({ players, hostId, state, isHost, send }: Props) {
  const { phase, ruleType } = state;
  const showScore = !isLobbyPhase(phase);
  const showBuzzRank = isBuzzPhase(phase);

  const sorted = [...players].sort((a, b) => {
    if (a.hasWon !== b.hasWon) return a.hasWon ? -1 : 1;
    if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
    return b.correctCount - a.correctCount || b.score - a.score;
  });

  const title = isLobbyPhase(phase) ? `参加者 (${players.length}人)` : "スコア";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-bold mb-3 text-gray-900">{title}</h2>
      <ol className="space-y-2">
        {sorted.map((p) => {
          const status = playerStatus(p, state);
          const rank = showBuzzRank ? buzzRank(p.id, state.buzzes) : null;

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
                {rank != null && (
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      rank === 1
                        ? "bg-yellow-400 text-gray-900"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {rank}位
                  </span>
                )}
                {showScore &&
                  (isHost && send ? (
                    <ScoreEditor player={p} state={state} send={send} />
                  ) : (
                    <ScoreDisplay player={p} ruleType={ruleType} />
                  ))}
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
