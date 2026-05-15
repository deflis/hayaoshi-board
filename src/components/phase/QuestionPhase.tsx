import type { RoomState } from "../../party/types";

interface Props {
  state: RoomState;
  onBuzz: () => void;
  isHost: boolean;
  myPlayerId: string | null;
}

export function QuestionPhase({ state, isHost, myPlayerId }: Props) {
  const myPlayer = myPlayerId ? state.players[myPlayerId] : null;
  const alreadyBuzzed = myPlayerId
    ? state.buzzes.some((b) => b.playerId === myPlayerId)
    : false;

  const isSuspended =
    myPlayer != null &&
    state.ruleType === "mon_kyu" &&
    myPlayer.suspendedUntilQuestion > 0 &&
    state.currentQuestionIndex <= myPlayer.suspendedUntilQuestion;

  const buzzCount = state.buzzes.length;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6 text-gray-900">
      <div className="w-full max-w-lg bg-white rounded-2xl border-2 border-green-400 px-8 py-10 text-center shadow-sm">
        <h2 className="text-4xl font-black text-gray-900 mb-3">
          早押し受付中！
        </h2>

        {isSuspended && myPlayer && (
          <p className="text-yellow-600 font-bold mt-2">
            💤 休み中（あと
            {myPlayer.suspendedUntilQuestion - state.currentQuestionIndex + 1}
            問）
          </p>
        )}
        {alreadyBuzzed && !isSuspended && (
          <p className="text-indigo-600 font-bold mt-2">✓ 押しました！</p>
        )}
        {myPlayer?.isEliminated && (
          <p className="text-red-600 font-bold mt-2">失格</p>
        )}
        {myPlayer?.hasWon && (
          <p className="text-yellow-600 font-bold mt-2">🏆 勝ち抜け済み</p>
        )}
        {isHost && !buzzCount && (
          <p className="text-gray-400 text-sm mt-2">
            プレイヤーの早押しを待っています
          </p>
        )}

        {buzzCount > 0 && (
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {state.buzzes.map((buzz) => (
              <span
                key={buzz.playerId}
                className="w-2.5 h-2.5 rounded-full bg-yellow-400"
              />
            ))}
            <span className="ml-2 text-sm text-gray-500">
              {buzzCount}人が押しています
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
