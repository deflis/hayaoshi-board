import type { ClientMessage, PlayerId, RoomState } from "../../party/types";
import { JudgementBadge } from "./JudgementBadge";

interface Props {
  state: RoomState;
  myPlayerId: PlayerId | null;
  send: (msg: ClientMessage) => void;
}

export function BoardPanel({ state, myPlayerId, send }: Props) {
  const { board, hostId, players } = state;
  const isHost = myPlayerId === hostId;
  const answerList = Object.values(board.answers).sort(
    (a, b) => a.submittedAt - b.submittedAt,
  );
  const hasJudgements = answerList.some((a) => a.judgement !== null);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-900">ボード</h2>
        <span className="text-xs text-gray-400">
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
              className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded transition-colors"
            >
              開く
            </button>
          )}
          {board.status === "answering" && (
            <>
              <button
                type="button"
                onClick={() => send({ type: "reveal_board_answers" })}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors"
              >
                公開
              </button>
              <button
                type="button"
                onClick={() => send({ type: "close_board" })}
                className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
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
                className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
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
                className="text-xs bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 rounded transition-colors"
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
              className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition-colors"
            >
              クリア
            </button>
          )}
        </div>
      )}

      {board.status !== "closed" && (
        <div className="space-y-1">
          {board.status === "answering" && (
            <p className="text-xs text-gray-400">
              提出済み {answerList.length} / {Object.keys(players).length} 人
            </p>
          )}

          {answerList.map((answer) => {
            const player = players[answer.playerId];
            const name = player?.name ?? answer.playerId;
            return (
              <div
                key={answer.playerId}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm"
              >
                <span className="flex-1 min-w-0 truncate text-gray-800">
                  {name}
                  {board.status === "revealed" && (
                    <span className="ml-2 text-gray-900 font-medium">
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
                          : "bg-gray-100 hover:bg-green-100 text-gray-700"
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
                          : "bg-gray-100 hover:bg-red-100 text-gray-700"
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
                        className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
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
            <p className="text-center text-xs text-gray-400 py-2">
              まだ回答がありません
            </p>
          )}
        </div>
      )}
    </section>
  );
}
