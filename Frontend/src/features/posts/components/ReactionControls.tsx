import { IconButton, IconButtonParticles } from "@animate-ui/react/primitives/buttons/icon";
import { Heart } from "@/components/animate-ui/icons/heart";
import type { ReactionCount } from "../types";

export type ReactionType = "heart";

interface Props {
  counts: ReactionCount[];
  mine: string[];
  onToggle: (reactionType: ReactionType) => Promise<void>;
  busy?: boolean;
}

export function ReactionControls({ counts, mine, onToggle, busy }: Props) {
  const selected = mine.includes("heart");
  const heartCount = counts.find((reaction) => reaction.reactionType === "heart")?.count ?? 0;

  return (
    <div className="reactions" role="group" aria-label="Post reaction">
      <IconButton
        type="button"
        className={`reactions__chip${selected ? " reactions__chip--active" : ""}`}
        onClick={() => void onToggle("heart")}
        disabled={busy}
        aria-busy={busy || undefined}
        aria-pressed={selected}
        aria-label={`${selected ? "Remove" : "Add"} heart reaction. ${heartCount} hearts`}
        title={selected ? "Remove heart reaction" : "Add heart reaction"}
      >
        <Heart
          className="reaction-icon reaction-icon--heart"
          size={20}
          strokeWidth={1.7}
          fill={selected ? "currentColor" : "none"}
          aria-hidden="true"
        />
        <span className="reactions__count" aria-hidden="true">{heartCount}</span>
        <IconButtonParticles className="reactions__particles" />
      </IconButton>
    </div>
  );
}
