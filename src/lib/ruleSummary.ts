import type { RoomState, RuleType } from "../party/types";

export const RULE_LABELS: Record<RuleType, string> = {
  simple: "シンプル",
  mon_batsu: "m○n×",
  mon_kyu: "m○n休",
  nbn: "NbyN",
  points: "+N/-M",
} as const;

export const TRANSITION_LABELS = {
  single_chance: "シングルチャンス",
  endless_chance: "エンドレスチャンス",
  second_chance: "2着切り",
  all_order: "全順回答",
} as const;

export function ruleSummary(state: RoomState): string {
  const t = TRANSITION_LABELS[state.answerTransition];
  switch (state.ruleType) {
    case "mon_batsu":
      return `${state.winCount}○${state.eliminateCount}× ／ ${t}`;
    case "mon_kyu":
      return `${state.winCount}○${state.eliminateCount}休 ／ ${t}`;
    case "nbn":
      return `${state.nbyN}byN ／ ${t}`;
    case "points":
      return `+${state.addPoints}/-${state.subtractPoints} ${state.winPoints}pt ／ ${t}`;
    default:
      return t;
  }
}

export function ruleShortLabel(state: RoomState): string {
  switch (state.ruleType) {
    case "mon_batsu":
      return `${state.winCount}○${state.eliminateCount}×`;
    case "mon_kyu":
      return `${state.winCount}○${state.eliminateCount}休`;
    case "nbn":
      return `${state.nbyN}byN`;
    case "points":
      return `+${state.addPoints}/-${state.subtractPoints}`;
    default:
      return "シンプル";
  }
}
