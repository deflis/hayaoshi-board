import type { RoomState } from "../../party/types";
import { BuzzButton } from "../buzz/BuzzButton";

interface Props {
  state: RoomState;
  myPlayerId: string | null;
  onBuzz: () => void;
  isHost: boolean;
}

export function BuzzedPhase({ state, myPlayerId, onBuzz, isHost }: Props) {
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
  const isIneligible = !myPlayer || myPlayer.isEliminated || myPlayer.hasWon;
  const canBuzz = !isHost && !alreadyBuzzed && !isSuspended && !isIneligible;

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-white">
      <h2 className="text-xl font-bold text-gray-300">早押し結果</h2>

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
                  ? "bg-yellow-500 text-black"
                  : isMe
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-white"
              }`}
            >
              <span
                className={`w-6 text-center font-black ${isFirst ? "text-black" : "text-gray-400"}`}
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
                className={`text-sm font-mono ${isFirst ? "text-black/70" : "text-gray-400"}`}
              >
                {isFirst ? "基準" : `+${diffMs}ms`}
              </span>
            </div>
          );
        })}
      </div>

      {canBuzz && (
        <div className="flex flex-col items-center gap-2">
          <BuzzButton onClick={onBuzz} />
          <p className="text-gray-400 text-xs">まだ間に合います！</p>
        </div>
      )}

      {isSuspended && myPlayer && (
        <p className="text-yellow-400 text-sm font-bold">
          💤 休み中（あと
          {myPlayer.suspendedUntilQuestion - state.currentQuestionIndex + 1}問）
        </p>
      )}

      {!isHost && alreadyBuzzed && (
        <p className="text-gray-400 text-sm">ホストの判定を待っています...</p>
      )}

      <p className="text-gray-500 text-xs">
        判定対象:{" "}
        <span className="text-yellow-400">
          {players[buzzes[0]?.playerId]?.name}
        </span>
      </p>
    </div>
  );
}
