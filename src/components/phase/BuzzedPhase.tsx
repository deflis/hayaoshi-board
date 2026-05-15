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
    <div className="flex flex-col items-center gap-4 py-6 text-gray-900">
      {currentAnswerer && (
        <div className="w-full max-w-lg bg-yellow-400 rounded-2xl px-8 py-8 text-center shadow-sm">
          <p className="text-sm font-bold text-yellow-800 mb-1">🎯 早押し！</p>
          <p className="text-4xl font-black text-gray-900">
            {currentAnswerer.name}
          </p>
          {buzzes.length > 1 && (
            <p className="text-sm text-yellow-800 mt-2">
              あと{buzzes.length - 1}人が待機中
            </p>
          )}
        </div>
      )}

      {buzzes.length > 1 && (
        <div className="w-full max-w-lg space-y-1">
          {buzzes.slice(1).map((buzz, i) => {
            const player = players[buzz.playerId];
            const diffMs = buzz.buzzedAt - firstBuzzedAt;
            const isMe = buzz.playerId === myPlayerId;

            return (
              <div
                key={buzz.playerId}
                className={`flex items-center gap-3 rounded-xl px-4 py-2 ${
                  isMe
                    ? "bg-indigo-100 text-indigo-800"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <span className="w-6 text-center font-bold text-gray-500 text-sm">
                  {i + 2}
                </span>
                <span className="flex-1 font-medium text-sm">
                  {player?.name ?? "?"}
                  {isMe && (
                    <span className="ml-2 text-xs opacity-75">（あなた）</span>
                  )}
                </span>
                <span className="text-xs font-mono text-gray-400">
                  +{diffMs}ms
                </span>
              </div>
            );
          })}
        </div>
      )}

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
