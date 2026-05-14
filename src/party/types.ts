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
  // ルール設定
  ruleType: RuleType;
  answerTransition: AnswerTransitionRule;
  // m○n× / m○n休
  winCount: number;
  eliminateCount: number; // m○n×: 失格誤答数 / m○n休: 何問休み
  // NbyN
  nbyN: number;
  // +N/-M
  addPoints: number;
  subtractPoints: number;
  winPoints: number;
  eliminatePoints: number | null; // null = 失格なし
  nonBuzzerPoints: number; // 0 = 無効
}

export type ClientMessage = (
  | { type: "join"; name: string; sessionId?: PlayerId }
  | { type: "send_chat"; text: string }
  | { type: "leave_host" }
  | { type: "claim_host" }
  | { type: "start_question" }
  | { type: "buzz" }
  | { type: "judge"; correct: boolean }
  | { type: "through" }
  | { type: "next_question" }
  | { type: "finish_game" }
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

// ---- XState machine types ----

export type QuizContext = Omit<RoomState, "chatMessages">;

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
    }
  | { type: "HOST_DISCONNECTED"; playerId: PlayerId };

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
