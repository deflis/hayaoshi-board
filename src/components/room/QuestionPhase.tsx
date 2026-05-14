import { BuzzButton } from "./BuzzButton";
import type { RoomState } from "../../party/types";

interface Props {
  state: RoomState;
  onBuzz: () => void;
  isHost: boolean;
  myPlayerId: string | null;
}

export function QuestionPhase({ state, onBuzz, isHost, myPlayerId }: Props) {
  const alreadyBuzzed = myPlayerId
    ? state.buzzes.some((b) => b.playerId === myPlayerId)
    : false;

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-8 text-white">
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          問題 {state.currentQuestionIndex} / {state.totalQuestions}
        </p>
        <h2 className="text-3xl font-bold mt-2">早押し受付中！</h2>
      </div>

      {!isHost && (
        <BuzzButton onClick={onBuzz} disabled={alreadyBuzzed} />
      )}

      {!isHost && alreadyBuzzed && (
        <p className="text-yellow-400 text-sm font-bold">押しました！他の人を待っています</p>
      )}

      {isHost && (
        <p className="text-gray-400">プレイヤーの早押しを待っています</p>
      )}

      {state.buzzes.length > 0 && (
        <p className="text-gray-500 text-xs">{state.buzzes.length}人が押しています</p>
      )}
    </div>
  );
}
