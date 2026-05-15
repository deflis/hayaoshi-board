import type { Player, RuleType } from "../../party/types";

interface Props {
  player: Player;
  ruleType: RuleType;
}

export function ScoreDisplay({ player, ruleType }: Props) {
  switch (ruleType) {
    case "mon_batsu":
    case "mon_kyu":
    case "nbn":
      return (
        <span className="font-mono text-xs whitespace-nowrap">
          <span className="text-green-400">○{player.correctCount}</span>{" "}
          <span className="text-red-400">×{player.incorrectCount}</span>
        </span>
      );
    default:
      return (
        <span className="font-bold text-yellow-400">{player.score}pt</span>
      );
  }
}
