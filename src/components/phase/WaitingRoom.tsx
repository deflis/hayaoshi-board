import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { RoomState } from "../../party/types";
import { LastBuzzRanking } from "../buzz/LastBuzzRanking";
import { CopyButton } from "../ui/CopyButton";

interface Props {
  state: RoomState;
  roomId: string;
}

export function WaitingRoom({ state, roomId }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  return (
    <div className="space-y-4 text-gray-900">
      {state.lastBuzzes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <LastBuzzRanking
            buzzes={state.lastBuzzes}
            players={state.players}
            label="前の問題の着順"
          />
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-100">
        <button
          type="button"
          onClick={() => setInviteOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span>招待URL</span>
          {inviteOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {inviteOpen && (
          <div className="px-4 pb-3 border-t border-gray-100">
            <p className="text-sm break-all text-gray-700 mt-2 mb-2">{url}</p>
            <CopyButton value={url} />
          </div>
        )}
      </div>

      <p className="text-gray-400 text-sm text-center">
        ホストが問題を開始するまでお待ちください
      </p>
    </div>
  );
}
