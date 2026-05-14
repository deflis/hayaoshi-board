export type PlayerId = string;
export type PlayerRole = "host" | "player";

export type RuleType = "simple" | "mon_batsu" | "mon_kyu" | "nbn" | "points";

export type AnswerTransitionRule =
  | "single_chance"
  | "endless_chance"
  | "second_chance"
  | "all_order";

export interface Player {
  id: PlayerId;
  name: string;
  score: number;
  role: PlayerRole;
  correctCount: number;
  incorrectCount: number;
  isEliminated: boolean;
  hasWon: boolean;
  suspendedUntilQuestion: number; // m○n休: 何問目まで休みか（0=停止なし）
}

export type RoomPhase =
  | "lobby" // 参加待ち・ルール設定
  | "waiting" // 問題と問題の間
  | "question"
  | "buzzed"
  | "result"
  | "finished";

export interface BuzzEntry {
  playerId: PlayerId;
  buzzedAt: number;
}

export interface ChatMessage {
  id: string;
  playerId: PlayerId;
  playerName: string;
  text: string;
  sentAt: number;
}

export type BoardJudgement = "correct" | "incorrect" | null;
export type BoardStatus = "closed" | "answering" | "revealed";

export interface BoardAnswer {
  playerId: PlayerId;
  text: string;
  submittedAt: number;
  judgement: BoardJudgement;
}

export interface BoardState {
  status: BoardStatus;
  sessionId: string;
  answers: Record<PlayerId, BoardAnswer>;
}

export interface RoomState {
  roomId: string;
  phase: RoomPhase;
  hostId: PlayerId | null;
  players: Record<PlayerId, Player>;
  currentQuestionIndex: number;
  totalQuestions: number;
  buzzes: BuzzEntry[];
  lastBuzzes: BuzzEntry[]; // 前の問題のバズ着順（振り返り用）
  chatMessages: ChatMessage[];
  board: BoardState;
  // ルール設定
  ruleType: RuleType;
  answerTransition: AnswerTransitionRule;
  // m○n× / m○n休
  winCount: number;
  eliminateCount: number; // m○n×: 失格誤答数 / m○n休: 何問休み
  // NbyN
  nbyN: number;
  // 勝者数上限（0 = 制限なし）
  maxWinners: number;
  // +N/-M
  addPoints: number;
  subtractPoints: number;
  winPoints: number;
  eliminatePoints: number | null; // null = 失格なし
  nonBuzzerPoints: number; // 0 = 無効
}

// ---- XState machine types ----

export interface QuizContext {
  roomId: string;
  phase: RoomPhase;
  hostId: PlayerId | null;
  players: Record<PlayerId, Player>;
  currentQuestionIndex: number;
  totalQuestions: number;
  buzzes: BuzzEntry[];
  lastBuzzes: BuzzEntry[];
  ruleType: RuleType;
  answerTransition: AnswerTransitionRule;
  winCount: number;
  eliminateCount: number;
  nbyN: number;
  maxWinners: number;
  addPoints: number;
  subtractPoints: number;
  winPoints: number;
  eliminatePoints: number | null;
  nonBuzzerPoints: number;
}

export type ClientMessage = (
  | { type: "join"; name: string; sessionId?: PlayerId }
  | { type: "send_chat"; text: string }
  | { type: "open_board" }
  | { type: "close_board" }
  | { type: "submit_board_answer"; text: string }
  | { type: "reveal_board_answers" }
  | { type: "hide_board_answers" }
  | {
      type: "judge_board_answer";
      playerId: PlayerId;
      judgement: BoardJudgement;
    }
  | { type: "clear_board" }
  | { type: "apply_board_scores" }
  | { type: "leave_host" }
  | { type: "claim_host" }
  | { type: "start_question" }
  | { type: "buzz" }
  | { type: "judge"; correct: boolean }
  | { type: "through" }
  | { type: "next_question" }
  | { type: "finish_game" }
  | { type: "resume_game" }
  | { type: "start_game" }
  | { type: "restart_game" }
  | { type: "set_total_questions"; total: number }
  | {
      type: "set_player_stats";
      playerId: PlayerId;
      score?: number;
      correctCount?: number;
      incorrectCount?: number;
    }
  | {
      type: "set_rule";
      ruleType?: RuleType;
      answerTransition?: AnswerTransitionRule;
      winCount?: number;
      eliminateCount?: number;
      nbyN?: number;
      addPoints?: number;
      subtractPoints?: number;
      winPoints?: number;
      eliminatePoints?: number | null;
      nonBuzzerPoints?: number;
      maxWinners?: number;
    }
) & { sessionId?: PlayerId };

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

export type QuizEvent =
  | { type: "JOIN"; playerId: PlayerId; name: string; sessionId?: PlayerId }
  | { type: "LEAVE_HOST"; playerId: PlayerId }
  | { type: "CLAIM_HOST"; playerId: PlayerId }
  | { type: "SEND_CHAT"; playerId: PlayerId; text: string }
  | { type: "BUZZ"; playerId: PlayerId }
  | { type: "JUDGE"; playerId: PlayerId; correct: boolean }
  | { type: "THROUGH"; playerId: PlayerId }
  | { type: "NEXT_QUESTION"; playerId: PlayerId }
  | { type: "FINISH_GAME"; playerId: PlayerId }
  | { type: "RESUME_GAME"; playerId: PlayerId }
  | { type: "START_GAME"; playerId: PlayerId }
  | { type: "RESTART_GAME"; playerId: PlayerId }
  | { type: "START_QUESTION"; playerId: PlayerId }
  | { type: "SET_TOTAL_QUESTIONS"; playerId: PlayerId; total: number }
  | {
      type: "SET_PLAYER_STATS";
      playerId: PlayerId;
      targetPlayerId: PlayerId;
      score?: number;
      correctCount?: number;
      incorrectCount?: number;
    }
  | {
      type: "SET_RULE";
      playerId: PlayerId;
      ruleType?: RuleType;
      answerTransition?: AnswerTransitionRule;
      winCount?: number;
      eliminateCount?: number;
      nbyN?: number;
      addPoints?: number;
      subtractPoints?: number;
      winPoints?: number;
      eliminatePoints?: number | null;
      nonBuzzerPoints?: number;
      maxWinners?: number;
    }
  | { type: "HOST_DISCONNECTED"; playerId: PlayerId }
  | {
      type: "APPLY_BOARD_SCORES";
      playerId: PlayerId;
      judgements: Record<PlayerId, "correct" | "incorrect">;
    };

export type QuizEmit =
  | { type: "broadcastRoomState"; state: RoomState }
  | { type: "buzzAccepted"; entry: BuzzEntry; playerName: string }
  | {
      type: "judgeResult";
      correct: boolean;
      playerId: PlayerId;
      scores: Record<PlayerId, number>;
    }
  | { type: "gameFinished"; scores: Record<PlayerId, number> }
  | { type: "errorOccurred"; playerId: PlayerId; message: string };
