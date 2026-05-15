import type { BuzzEntry, Player, RoomState } from "../../party/types";
import { PlayerCard } from "./PlayerCard";

interface Props {
  players: Player[];
  hostId: string | null;
  buzzes?: BuzzEntry[];
  state?: RoomState;
}

export function PlayerList({ players, hostId, buzzes = [], state }: Props) {
  const buzzIndex = Object.fromEntries(buzzes.map((b, i) => [b.playerId, i]));

  return (
    <ul className="space-y-2">
      {players.map((p) => (
        <PlayerCard
          key={p.id}
          player={p}
          hostId={hostId}
          buzzIndex={buzzIndex}
          state={state}
        />
      ))}
    </ul>
  );
}
