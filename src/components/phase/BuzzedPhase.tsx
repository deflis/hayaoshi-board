import type { RoomState } from "../../party/types";

interface Props {
  state: RoomState;
  myPlayerId: string | null;
  onBuzz: () => void;
  isHost: boolean;
}

export function BuzzedPhase({ state, myPlayerId, isHost }: Props) {
  const { buzzes, players } = state;
  const firstBuzzedAt = buzzes[0]?.buzzedAt ?? 0;
  const alreadyBuzzed = myPlayerId
    ? buzzes.some((b) => b.playerId === myPlayerId)
    : false;

  const myPlayer = myPlayerId ? players[myPlayerId] : null;
  const isSuspended =
    myPlayer != null &&
    state.ruleType === "mon_kyu" &&
    myPlayer.suspendedUntilQuestion > 0 &&
    state.currentQuestionIndex <= myPlayer.suspendedUntilQuestion;

  const currentAnswerer = buzzes[0] ? players[buzzes[0].playerId] : null;

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-gray-900">
      <h2 className="text-xl font-bold text-gray-700">早押し結果</h2>

      {currentAnswerer && (
        <p className="text-sm text-gray-500">
          判定対象:{" "}
          <span className="text-indigo-600 font-bold">{currentAnswerer.name}</span>
          {buzzes.length > 1 && (
            <span className="ml-1 text-gray-400">
              （あと{buzzes.length - 1}人）
            </span>
          )}
        </p>
      )}

      <div className="w-full max-w-md space-y-2">
        {buzzes.map((buzz, i) => {
          const player = players[buzz.playerId];
          const diffMs = buzz.buzzedAt - firstBuzzedAt;
          const isMe = buzz.playerId === myPlayerId;
          const isFirst = i === 0;

          return (
            <div
              key={buzz.playerId}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                isFirst
                  ? "bg-yellow-400 text-gray-900"
                  : isMe
                    ? "bg-indigo-100 text-indigo-800"
                    : "bg-gray-100 text-gray-900"
              }`}
            >
              <span
                className={`w-6 text-center font-black ${isFirst ? "text-gray-900" : "text-gray-500"}`}
              >
                {i + 1}
              </span>
              <span className="flex-1 font-bold">
                {player?.name ?? "?"}
                {isMe && (
                  <span className="ml-2 text-sm opacity-75">（あなた）</span>
                )}
              </span>
              <span
                className={`text-sm font-mono ${isFirst ? "text-gray-700" : "text-gray-500"}`}
              >
                {isFirst ? "基準" : `+${diffMs}ms`}
              </span>
            </div>
          );
        })}
      </div>

      {isSuspended && myPlayer && (
        <p className="text-yellow-600 text-sm font-bold">
          💤 休み中（あと
          {myPlayer.suspendedUntilQuestion - state.currentQuestionIndex + 1}問）
        </p>
      )}

      {!isHost && alreadyBuzzed && (
        <p className="text-gray-500 text-sm">ホストの判定を待っています...</p>
      )}
    </div>
  );
}
