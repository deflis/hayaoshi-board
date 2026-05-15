import type { ClientMessage, RoomState } from "../../party/types";
import { BuzzButton } from "../buzz/BuzzButton";

interface Props {
  state: RoomState;
  isHost: boolean;
  myPlayerId: string | null;
  onBuzz: () => void;
  send: (msg: ClientMessage) => void;
}

export function ContextActionBar({
  state,
  isHost,
  myPlayerId,
  onBuzz,
  send,
}: Props) {
  const { phase, buzzes, players } = state;

  const myPlayer = myPlayerId ? players[myPlayerId] : null;
  const alreadyBuzzed = myPlayerId
    ? buzzes.some((b) => b.playerId === myPlayerId)
    : false;
  const isSuspended =
    myPlayer != null &&
    state.ruleType === "mon_kyu" &&
    myPlayer.suspendedUntilQuestion > 0 &&
    state.currentQuestionIndex <= myPlayer.suspendedUntilQuestion;
  const isIneligible = !myPlayer || myPlayer.isEliminated || myPlayer.hasWon;
  const canBuzz = !isHost && !isIneligible && !isSuspended;

  const currentAnswerer = buzzes[0] ? players[buzzes[0].playerId] : null;
  const isMonBatsu = state.ruleType === "mon_batsu";

  const winners = Object.values(players).filter((p) => p.hasWon);
  const hasActivePlayer =
    (state.maxWinners === 0 || winners.length < state.maxWinners) &&
    Object.values(players).some((p) => !p.hasWon && !p.isEliminated);

  if (phase === "lobby") {
    if (isHost) {
      const canStart = Object.keys(players).length >= 1;
      return (
        <div className="px-4 py-3">
          <button
            type="button"
            disabled={!canStart}
            onClick={() => send({ type: "start_game" })}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black text-xl py-4 rounded-lg transition-colors"
          >
            ゲームスタート
          </button>
        </div>
      );
    }
    return (
      <div className="px-4 py-3 text-center text-gray-500 text-sm">
        ホストがゲームを開始するまでお待ちください
      </div>
    );
  }

  if (phase === "waiting") {
    if (isHost) {
      return (
        <div className="px-4 py-3 flex gap-3">
          <button
            type="button"
            onClick={() => send({ type: "start_question" })}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            問題開始 ({state.currentQuestionIndex + 1}問目)
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("ゲームを終了しますか？スコアは保持されます。")) {
                send({ type: "finish_game" });
              }
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors"
          >
            終了
          </button>
        </div>
      );
    }
    return (
      <div className="px-4 py-3 text-center text-gray-500 text-sm">
        ホストが問題を開始するまでお待ちください
      </div>
    );
  }

  if (phase === "question") {
    if (isHost) {
      return (
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => send({ type: "through" })}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition-colors"
          >
            この問題をスルー
          </button>
        </div>
      );
    }
    if (canBuzz) {
      return (
        <div className="px-4 py-3">
          <BuzzButton onClick={onBuzz} disabled={alreadyBuzzed} />
        </div>
      );
    }
    return null;
  }

  if (phase === "buzzed") {
    if (isHost && currentAnswerer) {
      return (
        <div className="px-4 py-3 flex gap-3">
          <button
            type="button"
            onClick={() => send({ type: "judge", correct: true })}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {isMonBatsu
              ? `正解 ○${currentAnswerer.correctCount + 1}`
              : "正解"}
          </button>
          <button
            type="button"
            onClick={() => send({ type: "judge", correct: false })}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {isMonBatsu
              ? `不正解 ×${currentAnswerer.incorrectCount + 1}${
                  currentAnswerer.incorrectCount + 1 >= state.eliminateCount
                    ? "（失格）"
                    : ""
                }`
              : "不正解"}
          </button>
          <button
            type="button"
            onClick={() => send({ type: "through" })}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors"
          >
            スルー
          </button>
        </div>
      );
    }
    if (canBuzz && !alreadyBuzzed) {
      return (
        <div className="px-4 py-3">
          <BuzzButton onClick={onBuzz} />
        </div>
      );
    }
    return null;
  }

  if (phase === "result") {
    if (isHost) {
      return (
        <div className="px-4 py-3 flex gap-3">
          <button
            type="button"
            onClick={() => send({ type: "next_question" })}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            次の問題へ
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("ゲームを終了しますか？スコアは保持されます。")) {
                send({ type: "finish_game" });
              }
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors"
          >
            終了
          </button>
        </div>
      );
    }
    return (
      <div className="px-4 py-3 text-center text-gray-500 text-sm">
        ホストが次の問題に進みます...
      </div>
    );
  }

  if (phase === "finished") {
    if (isHost) {
      return (
        <div className="px-4 py-3 flex gap-3">
          {hasActivePlayer && (
            <button
              type="button"
              onClick={() => send({ type: "resume_game" })}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors"
            >
              続きから再開
            </button>
          )}
          <button
            type="button"
            onClick={() => send({ type: "restart_game" })}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            スコアリセットしてもう1回
          </button>
        </div>
      );
    }
    return null;
  }

  return null;
}
