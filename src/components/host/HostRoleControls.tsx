import { Crown } from "lucide-react";
import type { ClientMessage, RoomState } from "../../party/types";

interface Props {
  state: RoomState;
  isHost: boolean;
  myPlayerId: string | null;
  send: (msg: ClientMessage) => void;
}

export function HostRoleControls({ state, isHost, myPlayerId, send }: Props) {
  if (!myPlayerId) return null;
  if (isHost) return null;
  if (state.hostId !== null) return null;

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
      <p className="text-xs text-gray-500">現在ホストはいません</p>
      <button
        type="button"
        onClick={() => send({ type: "claim_host" })}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
      >
        <Crown size={16} />
        ホストになる
      </button>
    </section>
  );
}
