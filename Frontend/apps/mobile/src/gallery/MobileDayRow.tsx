import { useDayRow, type DayRowProps } from "@/pages/gallery/useDayRow";

export function MobileDayRow<T extends { id: string }>(props: DayRowProps<T>) {
  const { renderItem, mediaKind } = props;
  const { gridRef, scrollEdges, hoverHeight, hoverInset, height, handleKeyDown, screenWidth, rowInset, items, step, gap, rendered, enterGroup, recycle, slots, tileSize, tileHeight, screenHeight, handleScroll } = useDayRow(props);
  return <div className="gallery-day-row-shell" data-scroll-start={scrollEdges.start || undefined} data-scroll-end={scrollEdges.end || undefined}>
    <div ref={gridRef} className="gallery-date-grid gallery-date-grid--virtual gallery-day-row" data-media-kind={mediaKind}
      style={screenWidth < 768 ? undefined : { height: hoverHeight, marginTop: 8 - hoverInset, marginBottom: height - hoverHeight - (8 - hoverInset) }} onKeyDownCapture={handleKeyDown}
      onScroll={handleScroll}>
      <div aria-hidden="true" style={{ width: 2 * rowInset + items.length * step - gap, height: 1 }} />
      {items.length > 0 && rendered.length === 0 && <>
        <span tabIndex={0} aria-label="Enter media group" onFocus={() => enterGroup(0)} />
        <span tabIndex={0} aria-label="Enter media group from end" onFocus={() => enterGroup(items.length - 1)} />
      </>}
      {rendered.map(({ item, position }) => <div key={recycle ? slots.get(item.id) : item.id} className="gallery-window-cell" data-gallery-window-id={item.id} data-row-edge={position === 0 ? "start" : position === items.length - 1 ? "end" : undefined}
        style={{ width: tileSize, height: tileHeight, top: screenWidth < 768 ? screenHeight * 0.005 : hoverInset, left: rowInset + position * step }}>
        {renderItem(item)}
      </div>)}
    </div>
  </div>;
}
