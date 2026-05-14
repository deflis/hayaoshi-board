export type PlayerId = string;
export type PlayerRole = "host" | "player";

export interface Player {
  id: PlayerId;
  name: string;
  score: number;
  role: PlayerRole;
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
}

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "start_question" }
  | { type: "buzz" }
  | { type: "judge"; correct: boolean }
  | { type: "next_question" }
  | { type: "finish_game" }
  | { type: "set_total_questions"; total: number };

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
