import type { ReactionCount } from "../types";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { ReactionIcon } from "./ReactionIcon";

export const REACTION_TYPES = ["like", "heart", "laugh"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

interface Props {
  counts: ReactionCount[];
  mine: string[];
  onToggle: (reactionType: ReactionType) => Promise<void>;
  canRemove: boolean;
  busy?: boolean;
}

export function ReactionControls({ counts, mine, onToggle, canRemove, busy }: Props) {
  const countOf = (t: string) => counts.find((c) => c.reactionType === t)?.count ?? 0;
  const active = (t: string) => mine.includes(t);

  return (
    <div className="reactions" role="group" aria-label="Reactions">
      {REACTION_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          className={`reactions__chip ${active(t) ? "reactions__chip--active" : ""}`}
          onClick={() => onToggle(t)}
          disabled={busy || (active(t) && !canRemove)}
          aria-pressed={active(t)}
          aria-label={`${active(t) ? "Remove" : "Add"} ${t} reaction${active(t) && !canRemove ? " (admin only)" : ""}`}
          title={active(t) && !canRemove ? "Only administrators can remove reactions" : `${active(t) ? "Remove" : "Add"} ${t} reaction`}
        >
          {busy ? <LoaderCircle className="spinner__wheel" aria-hidden="true" /> : <ReactionIcon type={t} />}
          <span className="reactions__count">{countOf(t)}</span>
        </button>
      ))}
    </div>
  );
}
