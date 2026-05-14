import { useCallback, useRef } from "react";

// Vite が静的アセットを正しく解決できるよう import で URL を取得する
import buzzerSound from "../assets/quiz-buzzer-1.mp3";
import correctSound from "../assets/quiz-correct-1.mp3";
import incorrectSound from "../assets/quiz-incorrect-1.mp3";
import questionSound from "../assets/quiz-question-1.mp3";
import type { ServerMessage } from "../party/types";

/**
 * Audio インスタンスをあらかじめ生成し、再生時に cloneNode で使い回す。
 * これにより同一ファイルの連続再生や事前読み込みが可能。
 * SSR 時は Audio が存在しないため、play() が no-op になるフォールバックを使う。
 */
function createPlayer(src: string) {
  if (typeof Audio === "undefined") {
    return { play: () => {} };
  }
  const original = new Audio(src);
  original.preload = "auto";
  return {
    play: () => {
      const clone = original.cloneNode() as HTMLAudioElement;
      clone.volume = 1;
      clone.play().catch(() => {
        // ユーザー操作がないと再生できない場合がある（無視）
      });
    },
  };
}

const sounds = {
  question: createPlayer(questionSound),
  buzzer: createPlayer(buzzerSound),
  correct: createPlayer(correctSound),
  incorrect: createPlayer(incorrectSound),
} as const;

/**
 * サーバーから受け取ったメッセージを監視し、状態変化に応じて効果音を再生する。
 *
 * このフックはメッセージハンドラ関数を返す。
 * useQuizRoom の onServerMessage コールバックに渡して使う。
 *
 * 再生タイミング:
 * - phase が "question" に変わった → 問題開始音
 * - buzz_accepted 受信 → 早押しボタン音
 * - judge_result (correct) → 正解音
 * - judge_result (incorrect) → 不正解音
 * - game_finished → 正解音（お祝い）
 */
export function useSoundEffects() {
  const prevPhaseRef = useRef<string | null>(null);

  const handleMessage = useCallback((msg: ServerMessage) => {
    if (msg.type === "buzz_accepted") {
      sounds.buzzer.play();
    } else if (msg.type === "judge_result") {
      if (msg.correct) {
        sounds.correct.play();
      } else {
        sounds.incorrect.play();
      }
    } else if (msg.type === "game_finished") {
      sounds.correct.play();
    } else if (msg.type === "room_state") {
      const phase = msg.state.phase;
      const prev = prevPhaseRef.current;
      if (prev !== phase) {
        if (phase === "question") {
          sounds.question.play();
        }
      }
      prevPhaseRef.current = phase;
    }
  }, []);

  return handleMessage;
}
