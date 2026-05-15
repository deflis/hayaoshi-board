import { SlidersHorizontal } from "lucide-react";
import { ruleSummary, TRANSITION_LABELS } from "../../lib/ruleSummary";
import type { ClientMessage, RoomState } from "../../party/types";
import { CopyButton } from "../ui/CopyButton";

interface Props {
  state: RoomState;
  roomId: string;
  isHost: boolean;
  send: (msg: ClientMessage) => void;
  onOpenRuleSettings?: () => void;
}

const RULE_LABELS = {
  simple: "シンプル（+1pt）",
  mon_batsu: "m○n×",
  mon_kyu: "m○n休",
  nbn: "NbyN",
  points: "+N/-M",
} as const;

export function LobbyPhase({
  state,
  roomId,
  isHost,
  onOpenRuleSettings,
}: Props) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  return (
    <div className="space-y-4 text-gray-900">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">招待URL</p>
        <p className="text-sm break-all text-gray-700 mb-2">{url}</p>
        <CopyButton value={url} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500">ルール</p>
          {isHost && onOpenRuleSettings && (
            <button
              type="button"
              onClick={onOpenRuleSettings}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              <SlidersHorizontal size={12} />
              変更
            </button>
          )}
        </div>
        <p className="font-bold text-gray-900">{RULE_LABELS[state.ruleType]}</p>
        <p className="text-gray-400 text-xs mt-0.5">{ruleSummary(state)}</p>
        {state.boardEnabled && (
          <p className="text-xs text-indigo-600 mt-1">ボード機能: ON</p>
        )}
      </div>
    </div>
  );
}

// keep for local use elsewhere if needed
export { TRANSITION_LABELS };
