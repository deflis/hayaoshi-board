import type { ClientMessage, RoomState } from "../../party/types";
import { PlayerList } from "../player/PlayerList";
import { CopyButton } from "../ui/CopyButton";

interface Props {
  state: RoomState;
  roomId: string;
  isHost: boolean;
  send: (msg: ClientMessage) => void;
}

const RULE_LABELS = {
  simple: "シンプル（+1pt）",
  mon_batsu: "m○n×",
  mon_kyu: "m○n休",
  nbn: "NbyN",
  points: "+N/-M",
} as const;

function ruleSummary(state: RoomState): string {
  const r = state.ruleType;
  const t = TRANSITION_LABELS[state.answerTransition];
  switch (r) {
    case "mon_batsu":
      return `${state.winCount}○${state.eliminateCount}× ／ ${t}`;
    case "mon_kyu":
      return `${state.winCount}○${state.eliminateCount}休 ／ ${t}`;
    case "nbn":
      return `${state.nbyN}byN ／ ${t}`;
    case "points":
      return `+${state.addPoints}/-${state.subtractPoints} ${state.winPoints}pt ／ ${t}`;
    default:
      return `シンプル ／ ${t}`;
  }
}

const TRANSITION_LABELS = {
  single_chance: "シングルチャンス",
  endless_chance: "エンドレスチャンス",
  second_chance: "2着切り",
  all_order: "全順回答",
} as const;

export function LobbyPhase({ state, roomId, isHost: _isHost, send: _send }: Props) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  const players = Object.values(state.players);

  return (
    <div className="space-y-6 text-gray-900">
      <div>
        <h2 className="text-2xl font-bold mb-1">ロビー</h2>
        <p className="text-gray-500 text-sm">
          ルームID: <span className="font-mono">{roomId}</span>
        </p>
      </div>

      {url && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">招待URL</p>
          <p className="text-sm break-all text-gray-700">{url}</p>
          <CopyButton value={url} />
        </div>
      )}

      <div>
        <p className="text-sm text-gray-500 mb-2">
          参加者 ({players.length}人)
        </p>
        <PlayerList players={players} hostId={state.hostId} state={state} />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
        <p className="text-xs text-gray-500 mb-1">ルール</p>
        <p className="font-bold text-gray-900">{RULE_LABELS[state.ruleType]}</p>
        <p className="text-gray-400 text-xs mt-0.5">{ruleSummary(state)}</p>
      </div>
    </div>
  );
}
