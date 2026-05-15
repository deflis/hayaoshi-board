import type { BoardAnswer } from "../../party/types";

interface Props {
  answer: BoardAnswer;
}

export function JudgementBadge({ answer }: Props) {
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
