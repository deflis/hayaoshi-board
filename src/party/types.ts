export type PlayerId = string;
export type PlayerRole = "host" | "player";

export type RuleType = "simple" | "mon_batsu";

// 誤答後の回答権の遷移ルール
export type AnswerTransitionRule =
  | "single_chance"   // 誰かが誤答 → その問題終了
  | "endless_chance"  // 誤答 → バズリセットして再受付
  | "second_chance"   // 1人目誤答 → 2人目のみ回答可、それ以降は終了
  | "all_order";      // 押した全員に順番に回答機会（デフォルト）

export interface Player {
  id: PlayerId;
  name: string;
  score: number;
  role: PlayerRole;
  correctCount: number;
  incorrectCount: number;
  isEliminated: boolean;
  hasWon: boolean;
}

export type RoomPhase =
  | "waiting"
  | "question"
  | "buzzed"
  | "result"
  | "finished";

export interface BuzzEntry {
  playerId: PlayerId;
  buzzedAt: number;
}

export interface RoomState {
  roomId: string;
  phase: RoomPhase;
  hostId: PlayerId | null;
  players: Record<PlayerId, Player>;
  currentQuestionIndex: number;
  totalQuestions: number;
  buzzes: BuzzEntry[];
  // ルール設定
  ruleType: RuleType;
  winCount: number;         // m○n× の m（勝ち抜け正解数）
  eliminateCount: number;   // m○n× の n（失格誤答数）
  answerTransition: AnswerTransitionRule;
}

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "start_question" }
  | { type: "buzz" }
  | { type: "judge"; correct: boolean }
  | { type: "next_question" }
  | { type: "finish_game" }
  | { type: "set_total_questions"; total: number }
  | {
      type: "set_rule";
      ruleType?: RuleType;
      winCount?: number;
      eliminateCount?: number;
      answerTransition?: AnswerTransitionRule;
    };

export type ServerMessage =
  | { type: "room_state"; state: RoomState }
  | { type: "buzz_accepted"; entry: BuzzEntry; playerName: string }
  | {
      type: "judge_result";
      correct: boolean;
      playerId: PlayerId;
      scores: Record<PlayerId, number>;
    }
  | { type: "game_finished"; scores: Record<PlayerId, number> }
  | { type: "error"; message: string };
