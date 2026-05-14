import { BuzzButton } from "./BuzzButton";
import { LastBuzzRanking } from "./LastBuzzRanking";
import type { RoomState } from "../../party/types";

interface Props {
  state: RoomState;
  onBuzz: () => void;
  isHost: boolean;
  myPlayerId: string | null;
}

export function QuestionPhase({ state, onBuzz, isHost, myPlayerId }: Props) {
  const myPlayer = myPlayerId ? state.players[myPlayerId] : null;
  const alreadyBuzzed = myPlayerId
    ? state.buzzes.some((b) => b.playerId === myPlayerId)
    : false;

  const isSuspended =
    myPlayer != null &&
    state.ruleType === "mon_kyu" &&
    myPlayer.suspendedUntilQuestion > 0 &&
    state.currentQuestionIndex <= myPlayer.suspendedUntilQuestion;

  const isIneligible = myPlayer?.isEliminated || myPlayer?.hasWon;
  const buttonDisabled = alreadyBuzzed || isSuspended || !!isIneligible;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8 text-white">
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          問題 {state.currentQuestionIndex} / {state.totalQuestions}
        </p>
        <h2 className="text-3xl font-bold mt-2">早押し受付中！</h2>
      </div>

      {!isHost && !isIneligible && (
        <BuzzButton onClick={onBuzz} disabled={buttonDisabled} />
      )}

      {isSuspended && myPlayer && (
        <p className="text-yellow-400 font-bold">
          💤 休み中（あと{myPlayer.suspendedUntilQuestion - state.currentQuestionIndex + 1}問）
        </p>
      )}
      {alreadyBuzzed && !isSuspended && (
        <p className="text-yellow-400 text-sm font-bold">押しました！他の人を待っています</p>
      )}
      {myPlayer?.isEliminated && (
        <p className="text-red-400 font-bold">失格</p>
      )}
      {myPlayer?.hasWon && (
        <p className="text-yellow-400 font-bold">🏆 勝ち抜け済み</p>
      )}

      {isHost && (
        <p className="text-gray-400">プレイヤーの早押しを待っています</p>
      )}

      {state.buzzes.length > 0 && (
        <p className="text-gray-500 text-xs">{state.buzzes.length}人が押しています</p>
      )}

      {state.lastBuzzes.length > 0 && (
        <LastBuzzRanking buzzes={state.lastBuzzes} players={state.players} label="前の問題の着順" />
      )}
    </div>
  );
}
