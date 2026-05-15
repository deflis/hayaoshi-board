import { LogOut, X } from "lucide-react";
import type {
  AnswerTransitionRule,
  ClientMessage,
  RoomState,
  RuleType,
} from "../../party/types";
import { ToggleRow } from "../ui/ToggleRow";
import { RuleSettings } from "./RuleSettings";

interface Props {
  state: RoomState;
  send: (msg: ClientMessage) => void;
  onClose: () => void;
  isHost?: boolean;
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

export function RuleSettingsModal({ state, send, onClose, isHost }: Props) {
  const canEditCoreRules = state.phase === "lobby";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ルール設定"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        role="document"
        className="relative w-full max-w-sm rounded-2xl bg-white border border-gray-200 p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-6">ルール設定</h2>

        <div className="space-y-5">
          {!canEditCoreRules && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ゲーム開始後はルール種別・遷移ルールは変更できません
            </p>
          )}

          <fieldset
            disabled={!canEditCoreRules}
            className={!canEditCoreRules ? "opacity-50" : ""}
          >
            <div className="space-y-5">
              <div>
                <p className="text-xs text-gray-500 font-bold mb-2">
                  ルール種別
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {(Object.keys(RULE_LABELS) as RuleType[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => send({ type: "set_rule", ruleType: r })}
                      className={`text-xs py-2 rounded-lg transition-colors ${
                        state.ruleType === r
                          ? "bg-indigo-600 text-white font-bold"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      } disabled:cursor-not-allowed`}
                    >
                      {RULE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              <RuleSettings state={state} send={send} />

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">解答遷移ルール</p>
                  <select
                    value={state.answerTransition}
                    onChange={(e) =>
                      send({
                        type: "set_rule",
                        answerTransition: e.target
                          .value as AnswerTransitionRule,
                      })
                    }
                    className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
                  >
                    {Object.entries(TRANSITION_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </fieldset>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <ToggleRow
              label="ボード機能"
              checked={state.boardEnabled}
              onChange={(v) => send({ type: "set_rule", boardEnabled: v })}
            />

            <label className="flex items-center gap-2 text-sm text-gray-600">
              勝者数上限
              <input
                type="number"
                min={0}
                max={99}
                value={state.maxWinners}
                onChange={(e) =>
                  send({ type: "set_rule", maxWinners: Number(e.target.value) })
                }
                className="w-14 bg-white border border-gray-200 text-gray-900 rounded px-2 py-1 text-sm"
              />
              <span className="text-gray-400 text-xs">（0=制限なし）</span>
            </label>
          </div>

          {isHost && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-2">ホスト管理</p>
              <button
                type="button"
                onClick={() => {
                  send({ type: "leave_host" });
                  onClose();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200"
              >
                <LogOut size={16} />
                ホストを抜ける
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
