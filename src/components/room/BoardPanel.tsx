import { type FormEvent, useState } from "react";
import type {
  BoardAnswer,
  ClientMessage,
  PlayerId,
  RoomState,
} from "../../party/types";

interface Props {
  state: RoomState;
  myPlayerId: PlayerId | null;
  send: (msg: ClientMessage) => void;
}

function JudgementBadge({ answer }: { answer: BoardAnswer }) {
  if (answer.judgement === "correct") {
    return (
      <span className="ml-1 rounded px-1 py-0.5 text-xs font-bold bg-green-600 text-white">
        ○
      </span>
    );
  }
  if (answer.judgement === "incorrect") {
    return (
      <span className="ml-1 rounded px-1 py-0.5 text-xs font-bold bg-red-600 text-white">
        ×
      </span>
    );
  }
  return null;
}

export function BoardPanel({ state, myPlayerId, send }: Props) {
  const [text, setText] = useState("");
  const { board, hostId, players } = state;
  const isHost = myPlayerId === hostId;
  const myAnswer = myPlayerId ? board.answers[myPlayerId] : null;
  const answerList = Object.values(board.answers).sort(
    (a, b) => a.submittedAt - b.submittedAt,
  );
  const hasJudgements = answerList.some((a) => a.judgement !== null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    send({ type: "submit_board_answer", text: trimmed });
    setText("");
  }

  return (
    <section className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white">ボード</h2>
        <span className="text-xs text-gray-500">
          {board.status === "closed" && "非アクティブ"}
          {board.status === "answering" && "回答受付中"}
          {board.status === "revealed" && "公開中"}
        </span>
      </div>

      {isHost && (
        <div className="flex flex-wrap gap-1">
          {board.status === "closed" && (
            <button
              type="button"
              onClick={() => send({ type: "open_board" })}
              className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded transition-colors"
            >
              開く
            </button>
          )}
          {board.status === "answering" && (
            <>
              <button
                type="button"
                onClick={() => send({ type: "reveal_board_answers" })}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
              >
                公開
              </button>
              <button
                type="button"
                onClick={() => send({ type: "close_board" })}
                className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded transition-colors"
              >
                締切
              </button>
            </>
          )}
          {board.status === "revealed" && (
            <>
              <button
                type="button"
                onClick={() => send({ type: "hide_board_answers" })}
                className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded transition-colors"
              >
                非公開に戻す
              </button>
              <button
                type="button"
                disabled={!hasJudgements}
                onClick={() => {
                  if (
                    window.confirm(
                      "採点結果を点数に反映します。ボードはクリアされます。よろしいですか？",
                    )
                  ) {
                    send({ type: "apply_board_scores" });
                  }
                }}
                className="text-xs bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white px-2 py-1 rounded transition-colors"
              >
                点数反映
              </button>
            </>
          )}
          {board.status !== "closed" && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("ボードをクリアしますか？")) {
                  send({ type: "clear_board" });
                }
              }}
              className="text-xs bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
            >
              クリア
            </button>
          )}
        </div>
      )}

      {board.status === "answering" && !myAnswer && myPlayerId && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            maxLength={300}
            onChange={(e) => setText(e.target.value)}
            placeholder="回答を入力..."
            className="min-w-0 flex-1 rounded-lg bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
          >
            送信
          </button>
        </form>
      )}

      {board.status === "answering" && myAnswer && (
        <p className="text-xs text-green-400">回答済み: 「{myAnswer.text}」</p>
      )}

      {board.status !== "closed" && (
        <div className="space-y-1">
          {board.status === "answering" && (
            <p className="text-xs text-gray-500">
              提出済み {answerList.length} / {Object.keys(players).length} 人
            </p>
          )}

          {answerList.map((answer) => {
            const player = players[answer.playerId];
            const name = player?.name ?? answer.playerId;
            return (
              <div
                key={answer.playerId}
                className="flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-sm"
              >
                <span className="flex-1 min-w-0 truncate text-gray-200">
                  {name}
                  {board.status === "revealed" && (
                    <span className="ml-2 text-white font-medium">
                      「{answer.text}」
                    </span>
                  )}
                  <JudgementBadge answer={answer} />
                </span>
                {isHost && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        send({
                          type: "judge_board_answer",
                          playerId: answer.playerId,
                          judgement: "correct",
                        })
                      }
                      className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                        answer.judgement === "correct"
                          ? "bg-green-600 text-white"
                          : "bg-gray-600 hover:bg-green-700 text-gray-300"
                      }`}
                    >
                      ○
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        send({
                          type: "judge_board_answer",
                          playerId: answer.playerId,
                          judgement: "incorrect",
                        })
                      }
                      className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                        answer.judgement === "incorrect"
                          ? "bg-red-600 text-white"
                          : "bg-gray-600 hover:bg-red-700 text-gray-300"
                      }`}
                    >
                      ×
                    </button>
                    {answer.judgement !== null && (
                      <button
                        type="button"
                        onClick={() =>
                          send({
                            type: "judge_board_answer",
                            playerId: answer.playerId,
                            judgement: null,
                          })
                        }
                        className="text-xs px-1.5 py-0.5 rounded bg-gray-600 hover:bg-gray-500 text-gray-300 transition-colors"
                      >
                        取消
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {answerList.length === 0 && (
            <p className="text-center text-xs text-gray-500 py-2">
              まだ回答がありません
            </p>
          )}
        </div>
      )}
    </section>
  );
}
