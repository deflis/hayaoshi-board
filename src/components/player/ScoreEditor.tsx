import type { ClientMessage, Player, RoomState } from "../../party/types";

interface Props {
  player: Player;
  state: RoomState;
  send: (msg: ClientMessage) => void;
}

export function ScoreEditor({ player, state, send }: Props) {
  const inputClass =
    "w-14 rounded bg-white px-2 py-1 text-right font-mono text-xs text-gray-900 ring-1 ring-gray-200 focus:outline-none focus:ring-indigo-500";

  if (
    state.ruleType === "mon_batsu" ||
    state.ruleType === "mon_kyu" ||
    state.ruleType === "nbn"
  ) {
    return (
      <div className="flex items-center gap-1 whitespace-nowrap">
        <label className="flex items-center gap-1 text-green-600">
          <span className="text-xs">○</span>
          <input
            type="number"
            min={0}
            max={999}
            value={player.correctCount}
            onChange={(event) =>
              send({
                type: "set_player_stats",
                playerId: player.id,
                correctCount: Number(event.target.value),
              })
            }
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-1 text-red-600">
          <span className="text-xs">×</span>
          <input
            type="number"
            min={0}
            max={999}
            value={player.incorrectCount}
            onChange={(event) =>
              send({
                type: "set_player_stats",
                playerId: player.id,
                incorrectCount: Number(event.target.value),
              })
            }
            className={inputClass}
          />
        </label>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-1 text-yellow-600">
      <input
        type="number"
        min={-9999}
        max={9999}
        value={player.score}
        onChange={(event) =>
          send({
            type: "set_player_stats",
            playerId: player.id,
            score: Number(event.target.value),
          })
        }
        className={inputClass}
      />
      <span className="text-xs font-bold">pt</span>
    </label>
  );
}
