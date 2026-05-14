import type { Player } from "../../party/types";

interface Props {
  players: Player[];
  hostId: string | null;
}

export function Scoreboard({ players, hostId }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h2 className="text-lg font-bold mb-3 text-white">スコア</h2>
      <ol className="space-y-2">
        {sorted.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center gap-2 text-sm text-white"
          >
            <span className="w-5 text-gray-400">{i + 1}.</span>
            <span className="flex-1 truncate">
              {hostId === p.id && (
                <span className="text-xs bg-blue-600 rounded px-1 mr-1">ホスト</span>
              )}
              {p.name}
            </span>
            <span className="font-bold text-yellow-400">{p.score}pt</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
