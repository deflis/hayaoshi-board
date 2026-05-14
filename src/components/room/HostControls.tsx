import type { ClientMessage, RoomState } from "../../party/types";

interface Props {
  state: RoomState;
  send: (msg: ClientMessage) => void;
}

export function HostControls({ state, send }: Props) {
  const { phase, totalQuestions, currentQuestionIndex, buzzes, players } = state;
  const currentAnswerer = buzzes[0] ? players[buzzes[0].playerId] : null;

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">ホスト操作</h3>

      {(phase === "waiting" || phase === "result") && (
        <button
          type="button"
          onClick={() => send({ type: "start_question" })}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          問題開始 ({currentQuestionIndex + 1}問目)
        </button>
      )}

      {phase === "result" && (
        <button
          type="button"
          onClick={() => send({ type: "next_question" })}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          次の問題へ
        </button>
      )}

      {phase === "question" && (
        <p className="text-gray-400 text-sm text-center">早押し待ち中...</p>
      )}

      {phase === "buzzed" && currentAnswerer && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 text-center">
            判定対象: <span className="text-yellow-400 font-bold">{currentAnswerer.name}</span>
            {buzzes.length > 1 && (
              <span className="ml-1 text-gray-500">（あと{buzzes.length - 1}人）</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => send({ type: "judge", correct: true })}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            正解 +1pt
          </button>
          <button
            type="button"
            onClick={() => send({ type: "judge", correct: false })}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {buzzes.length > 1 ? "不正解（次の人へ）" : "不正解（早押し再受付）"}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
        <label className="text-xs text-gray-400">総問数:</label>
        <input
          type="number"
          min={1}
          max={99}
          value={totalQuestions}
          onChange={(e) =>
            send({ type: "set_total_questions", total: Number(e.target.value) })
          }
          className="w-16 bg-gray-700 text-white text-sm rounded px-2 py-1"
        />
      </div>

      {(phase === "waiting" || phase === "result") && (
        <button
          type="button"
          onClick={() => send({ type: "finish_game" })}
          className="w-full bg-gray-600 hover:bg-gray-500 text-white text-sm py-1 px-4 rounded-lg transition-colors"
        >
          ゲーム終了
        </button>
      )}
    </div>
  );
}
