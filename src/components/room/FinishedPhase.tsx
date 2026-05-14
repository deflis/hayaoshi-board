import type { Player } from "../../party/types";

interface Props {
  players: Player[];
}

export function FinishedPhase({ players }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-white">
      <h2 className="text-3xl font-black">ゲーム終了！</h2>

      <div className="w-full max-w-sm space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
              i === 0
                ? "bg-yellow-500 text-black text-xl font-black"
                : i === 1
                  ? "bg-gray-300 text-black text-lg font-bold"
                  : i === 2
                    ? "bg-orange-600 text-white text-base font-bold"
                    : "bg-gray-700 text-white"
            }`}
          >
            <span className="w-8 text-center">{i + 1}位</span>
            <span className="flex-1">{p.name}</span>
            <span>{p.score}pt</span>
          </div>
        ))}
      </div>
    </div>
  );
}
