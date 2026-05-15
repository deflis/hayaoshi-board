import type { RoomState } from "../../party/types";
import { LastBuzzRanking } from "../buzz/LastBuzzRanking";
import { PlayerList } from "../player/PlayerList";
import { CopyButton } from "../ui/CopyButton";

interface Props {
  state: RoomState;
  roomId: string;
}

export function WaitingRoom({ state, roomId }: Props) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  return (
    <div className="space-y-6 text-gray-900">
      <div>
        <h2 className="text-2xl font-bold mb-1">参加待ち</h2>
        <p className="text-gray-500 text-sm">ルームID: {roomId}</p>
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
          参加者 ({Object.keys(state.players).length}人)
        </p>
        <PlayerList
          players={Object.values(state.players)}
          hostId={state.hostId}
        />
      </div>

      {state.lastBuzzes.length > 0 && (
        <LastBuzzRanking
          buzzes={state.lastBuzzes}
          players={state.players}
          label="前の問題の着順"
        />
      )}

      <p className="text-gray-400 text-sm text-center">
        ホストが問題を開始するまでお待ちください
      </p>
    </div>
  );
}
