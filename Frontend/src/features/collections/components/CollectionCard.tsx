import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimateIcon } from "@animate-ui/react/icons";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { useLocale } from "../../../context/LocaleContext";
import { mediaUrl } from "../../../utils/media";
import type { Collection } from "../types";

interface Props {
  collection: Collection;
  isOwner: boolean;
  showOwner?: boolean;
  /** Shown only to the owner. */
  onEdit?: (collection: Collection) => void;
}

export function CollectionCard({ collection, isOwner, showOwner = false, onEdit }: Props) {
  const { t } = useLocale();
  const [failedId, setFailedId] = useState<string | null>(null);
  const preview = collection.previewMediaId;
  const showImage = preview && failedId !== preview;
  const ownerLabel = isOwner ? t("You") : collection.owner.username;

  return (
    <article className="collection-card">
      <Link to={`/saved/${collection.id}`} className="collection-card__link" aria-label={t("Open collection {name}", { name: collection.name })}>
        <span className="collection-card__media">
          {showImage ? (
            <img src={mediaUrl(preview)} alt="" loading="lazy" onError={() => setFailedId(preview)} />
          ) : (
            <span className="collection-card__placeholder" aria-hidden="true"><Bookmark size={32} /></span>
          )}
          <span className="collection-card__badge">{t(collection.isPublic ? "Public" : "Private")}</span>
        </span>
        <span className="collection-card__body">
          <span className="collection-card__name">{collection.name}</span>
          <span className="collection-card__meta">
            {t("{count} posts", { count: collection.postCount })}
            {showOwner ? <> · <span className="collection-card__owner">{t("by {owner}", { owner: ownerLabel })}</span></> : null}
          </span>
        </span>
      </Link>
      {isOwner && onEdit ? (
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <button
            type="button"
            className="collection-card__edit"
            aria-label={t("Edit collection {name}", { name: collection.name })}
            title={t("Edit collection")}
            onClick={() => onEdit(collection)}
          >
            <PencilLine size={16} aria-hidden="true" />
          </button>
        </AnimateIcon>
      ) : null}
    </article>
  );
}
