import type { ClientMessage, RoomState } from "../../party/types";

interface Props {
  state: RoomState;
  send: (msg: ClientMessage) => void;
}

const inputClass = "w-12 bg-white border border-gray-200 text-gray-900 rounded px-2 py-1";

export function RuleSettings({ state, send }: Props) {
  const s = state;
  switch (s.ruleType) {
    case "mon_batsu":
      return (
        <div className="flex gap-2 text-xs">
          <label className="flex items-center gap-1 text-gray-500">
            <span className="text-green-600">○</span>
            <input
              type="number"
              min={1}
              max={99}
              value={s.winCount}
              onChange={(e) =>
                send({ type: "set_rule", winCount: Number(e.target.value) })
              }
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-1 text-gray-500">
            <span className="text-red-600">×</span>
            <input
              type="number"
              min={1}
              max={99}
              value={s.eliminateCount}
              onChange={(e) =>
                send({
                  type: "set_rule",
                  eliminateCount: Number(e.target.value),
                })
              }
              className={inputClass}
            />
          </label>
        </div>
      );
    case "mon_kyu":
      return (
        <div className="flex gap-2 text-xs">
          <label className="flex items-center gap-1 text-gray-500">
            <span className="text-green-600">○</span>
            <input
              type="number"
              min={1}
              max={99}
              value={s.winCount}
              onChange={(e) =>
                send({ type: "set_rule", winCount: Number(e.target.value) })
              }
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-1 text-gray-500">
            <span className="text-yellow-600">休</span>
            <input
              type="number"
              min={1}
              max={99}
              value={s.eliminateCount}
              onChange={(e) =>
                send({
                  type: "set_rule",
                  eliminateCount: Number(e.target.value),
                })
              }
              className={inputClass}
            />
          </label>
        </div>
      );
    case "nbn":
      return (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>N =</span>
          <input
            type="number"
            min={1}
            max={99}
            value={s.nbyN}
            onChange={(e) =>
              send({ type: "set_rule", nbyN: Number(e.target.value) })
            }
            className="w-16 bg-white border border-gray-200 text-gray-900 rounded px-2 py-1"
          />
        </div>
      );
    case "points":
      return (
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex gap-2">
            <label className="flex items-center gap-1">
              <span className="text-green-600">+</span>
              <input
                type="number"
                min={0}
                max={99}
                value={s.addPoints}
                onChange={(e) =>
                  send({ type: "set_rule", addPoints: Number(e.target.value) })
                }
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-red-600">-</span>
              <input
                type="number"
                min={0}
                max={99}
                value={s.subtractPoints}
                onChange={(e) =>
                  send({
                    type: "set_rule",
                    subtractPoints: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </label>
          </div>
          <label className="flex items-center gap-1">
            勝抜
            <input
              type="number"
              min={1}
              max={999}
              value={s.winPoints}
              onChange={(e) =>
                send({ type: "set_rule", winPoints: Number(e.target.value) })
              }
              className="w-16 bg-white border border-gray-200 text-gray-900 rounded px-2 py-1"
            />
            pt
          </label>
          <label className="flex items-center gap-1">
            失格
            <input
              type="number"
              max={0}
              value={s.eliminatePoints ?? ""}
              placeholder="なし"
              onChange={(e) =>
                send({
                  type: "set_rule",
                  eliminatePoints:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-16 bg-white border border-gray-200 text-gray-900 rounded px-2 py-1"
            />
            pt以下
          </label>
          <label className="flex items-center gap-1">
            未押下正解
            <input
              type="number"
              min={0}
              max={99}
              value={s.nonBuzzerPoints}
              onChange={(e) =>
                send({
                  type: "set_rule",
                  nonBuzzerPoints: Number(e.target.value),
                })
              }
              className={inputClass}
            />
            pt
          </label>
        </div>
      );
    default:
      return null;
  }
}
