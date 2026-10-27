import { IconButton, IconButtonParticles } from "@animate-ui/react/primitives/buttons/icon";
import { Heart } from "@/components/animate-ui/icons/heart";
import type { ReactionCount } from "../types";
import { useLocale } from "../../../context/LocaleContext";

export type ReactionType = "heart";

interface Props {
  counts: ReactionCount[];
  mine: string[];
  onToggle: (reactionType: ReactionType) => Promise<void>;
  busy?: boolean;
}

export function ReactionControls({ counts, mine, onToggle, busy }: Props) {
  const { t } = useLocale();
  const selected = mine.includes("heart");
  const heartCount = counts.find((reaction) => reaction.reactionType === "heart")?.count ?? 0;

  return (
    <div className="reactions" role="group" aria-label={t("Post reaction")}>
      <IconButton
        type="button"
        className={`reactions__chip${selected ? " reactions__chip--active" : ""}`}
        onClick={() => void onToggle("heart")}
        disabled={busy}
        aria-busy={busy || undefined}
        aria-pressed={selected}
        aria-label={t(`${selected ? "Remove" : "Add"} heart reaction. {count} hearts`, { count: heartCount })}
        title={t(selected ? "Remove heart reaction" : "Add heart reaction")}
      >
        <Heart
          className="reaction-icon reaction-icon--heart"
          size={20}
          strokeWidth={1.7}
          fill={selected ? "var(--danger)" : "none"}
          stroke="var(--danger)"
          aria-hidden="true"
        />
        <span className="reactions__count" aria-hidden="true">{heartCount}</span>
        <IconButtonParticles className="reactions__particles" />
      </IconButton>
    </div>
  );
}
