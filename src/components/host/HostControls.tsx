import type {
  AnswerTransitionRule,
  ClientMessage,
  RoomState,
  RuleType,
} from "../../party/types";
import { RuleSettings } from "./RuleSettings";

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

const RULE_LABELS: Record<RuleType, string> = {
  simple: "シンプル",
  mon_batsu: "m○n×",
  mon_kyu: "m○n休",
  nbn: "NbyN",
  points: "+N/-M",
};

export function HostControls({ state, send }: Props) {
  const { phase, buzzes, players } = state;
  const currentAnswerer = buzzes[0] ? players[buzzes[0].playerId] : null;
  const isMonBatsu = state.ruleType === "mon_batsu";

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
        ホスト操作
      </h3>

      {phase === "lobby" && (
        <div className="space-y-2 pb-3 border-b border-gray-700">
          <p className="text-xs text-gray-400 font-bold">ルール設定</p>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(RULE_LABELS) as RuleType[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => send({ type: "set_rule", ruleType: r })}
                className={`text-xs py-1 rounded transition-colors ${
                  state.ruleType === r
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {RULE_LABELS[r]}
              </button>
            ))}
          </div>
          <RuleSettings state={state} send={send} />
          <label className="flex items-center gap-2 text-xs text-gray-400">
            勝者数上限
            <input
              type="number"
              min={0}
              max={99}
              value={state.maxWinners}
              onChange={(e) =>
                send({ type: "set_rule", maxWinners: Number(e.target.value) })
              }
              className="w-12 bg-gray-700 text-white rounded px-2 py-1"
            />
            <span className="text-gray-500">（0=制限なし）</span>
          </label>
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
            {Object.entries(TRANSITION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => send({ type: "start_game" })}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-lg transition-colors"
          >
            ゲームスタート
          </button>
        </div>
      )}

      {(phase === "waiting" || phase === "result") && (
        <>
          <button
            type="button"
            onClick={() => send({ type: "start_question" })}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            問題開始 ({state.currentQuestionIndex + 1}問目)
          </button>
          <p className="text-xs text-gray-500 text-center">
            {state.ruleType !== "simple" && (
              <span>ルール: {RULE_LABELS[state.ruleType]}</span>
            )}
          </p>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            勝者数上限
            <input
              type="number"
              min={0}
              max={99}
              value={state.maxWinners}
              onChange={(e) =>
                send({ type: "set_rule", maxWinners: Number(e.target.value) })
              }
              className="w-12 bg-gray-700 text-white rounded px-2 py-1"
            />
            <span className="text-gray-500">（0=制限なし）</span>
          </label>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm("ゲームを終了しますか？スコアは保持されます。")
              ) {
                send({ type: "finish_game" });
              }
            }}
            className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            ゲームを終了する
          </button>
        </>
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
        <div className="space-y-2">
          <p className="text-gray-400 text-sm text-center">早押し待ち中...</p>
          <button
            type="button"
            onClick={() => send({ type: "through" })}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            この問題をスルー
          </button>
        </div>
      )}

      {phase === "buzzed" && currentAnswerer && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 text-center">
            判定対象:{" "}
            <span className="text-yellow-400 font-bold">
              {currentAnswerer.name}
            </span>
            {buzzes.length > 1 && (
              <span className="ml-1 text-gray-500">
                （あと{buzzes.length - 1}人）
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => send({ type: "judge", correct: true })}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {isMonBatsu ? `正解 ○${currentAnswerer.correctCount + 1}` : "正解"}
          </button>
          <button
            type="button"
            onClick={() => send({ type: "judge", correct: false })}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {isMonBatsu
              ? `不正解 ×${currentAnswerer.incorrectCount + 1}${
                  currentAnswerer.incorrectCount + 1 >= state.eliminateCount
                    ? "（失格）"
                    : ""
                }`
              : "不正解"}
          </button>
          <button
            type="button"
            onClick={() => send({ type: "through" })}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            回答をスルー
          </button>
        </div>
      )}

      {(phase === "waiting" || phase === "result") && (
        <button
          type="button"
          onClick={() => send({ type: "finish_game" })}
          className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          ゲーム終了
        </button>
      )}
    </div>
  );
}
