import { type FormEvent, useState } from "react";
import type { ClientMessage, RoomState } from "../../party/types";
import { BuzzButton } from "../buzz/BuzzButton";

interface Props {
  state: RoomState;
  isHost: boolean;
  myPlayerId: string | null;
  onBuzz: () => void;
  send: (msg: ClientMessage) => void;
}

function BoardInputSection({
  state,
  myPlayerId,
  send,
}: {
  state: RoomState;
  myPlayerId: string | null;
  send: (msg: ClientMessage) => void;
}) {
  const [text, setText] = useState("");
  const { board } = state;
  const myAnswer = myPlayerId ? board.answers[myPlayerId] : null;

  if (board.status !== "answering") return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    send({ type: "submit_board_answer", text: trimmed });
    setText("");
  }

  if (myAnswer) {
    return (
      <div className="px-4 py-2 border-t border-gray-100 text-xs text-green-600">
        ボード回答済み: 「{myAnswer.text}」
      </div>
    );
  }

  return (
    <div className="px-4 py-2 border-t border-gray-100">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
          placeholder="ボードに回答を入力..."
          className="min-w-0 flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
        >
          送信
        </button>
      </form>
    </div>
  );
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

  const showBoardInput = !isHost && state.boardEnabled && myPlayerId;

  let phaseContent: React.ReactNode = null;

  if (phase === "lobby") {
    if (isHost) {
      const canStart = Object.keys(players).length >= 1;
      phaseContent = (
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
    } else {
      phaseContent = (
        <div className="px-4 py-3 text-center text-gray-500 text-sm">
          ホストがゲームを開始するまでお待ちください
        </div>
      );
    }
  } else if (phase === "waiting") {
    if (isHost) {
      phaseContent = (
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
              if (
                window.confirm("ゲームを終了しますか？スコアは保持されます。")
              ) {
                send({ type: "finish_game" });
              }
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors"
          >
            終了
          </button>
        </div>
      );
    } else {
      phaseContent = (
        <div className="px-4 py-3 text-center text-gray-500 text-sm">
          ホストが問題を開始するまでお待ちください
        </div>
      );
    }
  } else if (phase === "question") {
    if (isHost) {
      phaseContent = (
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
    } else if (canBuzz) {
      phaseContent = (
        <div className="px-4 py-3">
          <BuzzButton onClick={onBuzz} disabled={alreadyBuzzed} />
        </div>
      );
    }
  } else if (phase === "buzzed") {
    if (isHost && currentAnswerer) {
      phaseContent = (
        <div className="px-4 py-3 flex gap-3">
          <button
            type="button"
            onClick={() => send({ type: "judge", correct: true })}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {isMonBatsu ? `正解 ○${currentAnswerer.correctCount + 1}` : "正解"}
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
    } else if (canBuzz && !alreadyBuzzed) {
      phaseContent = (
        <div className="px-4 py-3">
          <BuzzButton onClick={onBuzz} />
        </div>
      );
    }
  } else if (phase === "result") {
    if (isHost) {
      phaseContent = (
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
              if (
                window.confirm("ゲームを終了しますか？スコアは保持されます。")
              ) {
                send({ type: "finish_game" });
              }
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors"
          >
            終了
          </button>
        </div>
      );
    } else {
      phaseContent = (
        <div className="px-4 py-3 text-center text-gray-500 text-sm">
          ホストが次の問題に進みます...
        </div>
      );
    }
  } else if (phase === "finished") {
    if (isHost) {
      phaseContent = (
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
  }

  if (!phaseContent && !showBoardInput) return null;

  return (
    <>
      {phaseContent}
      {showBoardInput && (
        <BoardInputSection state={state} myPlayerId={myPlayerId} send={send} />
      )}
    </>
  );
}
