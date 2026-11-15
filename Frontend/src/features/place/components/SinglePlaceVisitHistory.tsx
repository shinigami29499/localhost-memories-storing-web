import { PlaceDialog } from "./PlaceDialog";
import { SinglePlaceVisitHistoryShared, type SinglePlaceVisitHistoryProps } from "./SinglePlaceVisitHistoryShared";

type Props = Omit<SinglePlaceVisitHistoryProps, "DialogComponent"> & Partial<Pick<SinglePlaceVisitHistoryProps, "DialogComponent">>;

export function SinglePlaceVisitHistory({ DialogComponent = PlaceDialog, ...props }: Props) {
  return <SinglePlaceVisitHistoryShared {...props} DialogComponent={DialogComponent} />;
}
