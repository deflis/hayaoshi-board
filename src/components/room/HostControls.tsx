import type {
  AnswerTransitionRule,
  ClientMessage,
  RuleType,
  RoomState,
} from "../../party/types";

interface Props {
  state: RoomState;
  send: (msg: ClientMessage) => void;
}

const TRANSITION_LABELS: Record<AnswerTransitionRule, string> = {
  single_chance: "シングルチャンス",
  endless_chance: "エンドレスチャンス",
  second_chance: "2着切り",
  all_order: "全順回答",
};

export function HostControls({ state, send }: Props) {
  const { phase, totalQuestions, currentQuestionIndex, buzzes, players } = state;
  const currentAnswerer = buzzes[0] ? players[buzzes[0].playerId] : null;
  const isMonBatsu = state.ruleType === "mon_batsu";

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">ホスト操作</h3>

      {/* ルール設定（waiting フェーズのみ） */}
      {phase === "waiting" && (
        <div className="space-y-2 pb-3 border-b border-gray-700">
          <p className="text-xs text-gray-400 font-bold">ルール設定</p>

          <div className="flex gap-1">
            {(["simple", "mon_batsu"] as RuleType[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => send({ type: "set_rule", ruleType: r })}
                className={`flex-1 text-xs py-1 rounded transition-colors ${
                  state.ruleType === r
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {r === "simple" ? "シンプル" : "m○n×"}
              </button>
            ))}
          </div>

          {isMonBatsu && (
            <div className="flex gap-2 text-xs">
              <label className="flex items-center gap-1 text-gray-400">
                <span className="text-green-400">○</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={state.winCount}
                  onChange={(e) =>
                    send({ type: "set_rule", winCount: Number(e.target.value) })
                  }
                  className="w-12 bg-gray-700 text-white rounded px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-1 text-gray-400">
                <span className="text-red-400">×</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={state.eliminateCount}
                  onChange={(e) =>
                    send({ type: "set_rule", eliminateCount: Number(e.target.value) })
                  }
                  className="w-12 bg-gray-700 text-white rounded px-2 py-1"
                />
              </label>
            </div>
          )}

          <select
            value={state.answerTransition}
            onChange={(e) =>
              send({
                type: "set_rule",
                answerTransition: e.target.value as AnswerTransitionRule,
              })
            }
            className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1"
          >
            {Object.entries(TRANSITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

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
            判定対象:{" "}
            <span className="text-yellow-400 font-bold">{currentAnswerer.name}</span>
            {buzzes.length > 1 && (
              <span className="ml-1 text-gray-500">（あと{buzzes.length - 1}人）</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => send({ type: "judge", correct: true })}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {isMonBatsu
              ? `正解 ○${currentAnswerer.correctCount + 1}`
              : "正解 +1pt"}
          </button>
          <button
            type="button"
            onClick={() => send({ type: "judge", correct: false })}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {isMonBatsu
              ? `不正解 ×${currentAnswerer.incorrectCount + 1}${
                  currentAnswerer.incorrectCount + 1 >= state.eliminateCount ? "（失格）" : ""
                }`
              : buzzes.length > 1
                ? "不正解（次の人へ）"
                : "不正解（早押し再受付）"}
          </button>
        </div>
      )}

      {!isMonBatsu && (
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
      )}

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
