import type { RoomState } from "../../party/types";

interface Props {
  state: RoomState;
}

export function ResultPhase({ state }: Props) {
  const answerer = state.buzzes[0]
    ? state.players[state.buzzes[0].playerId]
    : null;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8 text-gray-900">
      <div className="text-center bg-green-50 border-2 border-green-400 rounded-2xl p-8">
        <p className="text-green-600 text-sm mb-2">正解！</p>
        <p className="text-4xl font-black">{answerer?.name ?? "?"}</p>
        <p className="mt-2 text-green-600">+1pt</p>
      </div>

      <p className="text-gray-500 text-sm">ホストが次の問題に進みます...</p>
    </div>
  );
}
