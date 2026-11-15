import { PlaceDialog } from "./PlaceDialog";
import { PlaceVisitHistoryShared, type PlaceVisitHistoryProps } from "./PlaceVisitHistoryShared";

type Props = Omit<PlaceVisitHistoryProps, "DialogComponent"> & Partial<Pick<PlaceVisitHistoryProps, "DialogComponent">>;

export function PlaceVisitHistory({ DialogComponent = PlaceDialog, ...props }: Props) {
  return <PlaceVisitHistoryShared {...props} DialogComponent={DialogComponent} />;
}
