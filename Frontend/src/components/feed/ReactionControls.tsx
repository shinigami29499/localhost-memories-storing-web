import type { ReactionCount } from "../../types";

export const REACTION_TYPES = ["like", "heart", "laugh"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

const LABELS: Record<string, string> = { like: "👍", heart: "❤️", laugh: "😄" };

export function labelFor(reactionType: string): string {
  return LABELS[reactionType] ?? reactionType;
}

interface Props {
  counts: ReactionCount[];
  mine: string[];
  onToggle: (reactionType: ReactionType) => Promise<void>;
  busy?: boolean;
}

export function ReactionControls({ counts, mine, onToggle, busy }: Props) {
  const countOf = (t: string) => counts.find((c) => c.reactionType === t)?.count ?? 0;
  const active = (t: string) => mine.includes(t);

  return (
    <div className="reactions" role="group" aria-label="Reactions">
      {REACTION_TYPES.map((t) => (
        <button
          key={t}
          className={`reactions__chip ${active(t) ? "reactions__chip--active" : ""}`}
          onClick={() => onToggle(t)}
          disabled={busy}
          aria-pressed={active(t)}
          aria-label={`${active(t) ? "Remove" : "Add"} ${t} reaction`}
        >
          {labelFor(t)}
          <span className="reactions__count">{countOf(t)}</span>
        </button>
      ))}
    </div>
  );
}
