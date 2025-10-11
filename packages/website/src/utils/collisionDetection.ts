/**
 * Determines which row a Y coordinate falls into
 */
export function getRowFromY(
  yPosition: number,
  _stageHeight: number,
  numberOfRows: number,
  rowAreaTop: number,
  rowAreaHeight: number
): number {
  const relativeY = yPosition - rowAreaTop;
  
  if (relativeY < 0) return 0;
  if (relativeY > rowAreaHeight) return numberOfRows - 1;

  const rowHeight = rowAreaHeight / numberOfRows;
  const rowNumber = Math.floor(relativeY / rowHeight);
  
  return Math.max(0, Math.min(numberOfRows - 1, rowNumber));
}
