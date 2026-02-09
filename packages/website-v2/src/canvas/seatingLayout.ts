import type { Block, Seat, SeatingBlock } from '@choir-seating-manager/shared-v2'

export interface SeatLayoutPoint {
  seatIndex: number
  rowIndex: number
  columnIndex: number
  x: number
  y: number
}

export interface SeatingBlockSize {
  width: number
  height: number
}

const SEAT_RADIUS = 20
const SEAT_DIAMETER = SEAT_RADIUS * 2
const HORIZONTAL_GAP = 56
const VERTICAL_GAP = 56
const PADDING_X = 20
const PADDING_Y = 18
const HEADER_HEIGHT = 34
const FOOTER_HEIGHT = 14

export function getGridSizeFromBlockDimensions(width: number, height: number): { rows: number; columns: number } {
  const columns = Math.max(1, Math.round((width - (PADDING_X * 2 + SEAT_DIAMETER)) / HORIZONTAL_GAP) + 1)
  const rows = Math.max(
    1,
    Math.round((height - (HEADER_HEIGHT + PADDING_Y * 2 + SEAT_DIAMETER + FOOTER_HEIGHT)) / VERTICAL_GAP) + 1,
  )

  return { rows, columns }
}

export function normalizeRowSeatCounts(
  rows: number,
  columns: number,
): number[] {
  const normalizedRows = Math.max(1, Math.floor(rows))
  const normalizedColumns = Math.max(1, Math.floor(columns))

  return Array.from({ length: normalizedRows }, () => normalizedColumns)
}

function getSeatCountForBlock(block: SeatingBlock): number {
  const rowCounts = normalizeRowSeatCounts(block.rows, block.columns)
  return rowCounts.reduce((sum, rowCount) => sum + rowCount, 0)
}

export function createSeatsForBlock(block: SeatingBlock, existingSeats: Seat[] = []): Seat[] {
  const seatCount = getSeatCountForBlock(block)

  return Array.from({ length: seatCount }, (_, seatIndex) => {
    const existing = existingSeats[seatIndex]
    return {
      id: existing?.id ?? `${block.id}-seat-${seatIndex + 1}`,
      label: existing?.label ?? `${seatIndex + 1}`,
      assignment: existing?.assignment,
    }
  })
}

export function getSeatLayout(block: SeatingBlock): SeatLayoutPoint[] {
  const rowCounts = normalizeRowSeatCounts(block.rows, block.columns)
  const maxRowCount = Math.max(...rowCounts, 1)
  const maxRowWidth = (maxRowCount - 1) * HORIZONTAL_GAP

  let seatIndex = 0
  const points: SeatLayoutPoint[] = []

  rowCounts.forEach((rowCount, rowIndex) => {
    const rowWidth = (rowCount - 1) * HORIZONTAL_GAP
    const centeredOffset = (maxRowWidth - rowWidth) / 2
    const rowStartX = PADDING_X + SEAT_RADIUS + centeredOffset
    const rowY = HEADER_HEIGHT + PADDING_Y + SEAT_RADIUS + rowIndex * VERTICAL_GAP

    for (let columnIndex = 0; columnIndex < rowCount; columnIndex += 1) {
      points.push({
        seatIndex,
        rowIndex,
        columnIndex,
        x: rowStartX + columnIndex * HORIZONTAL_GAP,
        y: rowY,
      })
      seatIndex += 1
    }
  })

  return points
}

export function getSeatingBlockSize(block: SeatingBlock): SeatingBlockSize {
  const rowCounts = normalizeRowSeatCounts(block.rows, block.columns)
  const maxRowCount = Math.max(...rowCounts, 1)
  const maxRowWidth = (maxRowCount - 1) * HORIZONTAL_GAP

  const width = PADDING_X * 2 + SEAT_DIAMETER + maxRowWidth
  const height =
    HEADER_HEIGHT + PADDING_Y * 2 + SEAT_DIAMETER + (Math.max(1, block.rows) - 1) * VERTICAL_GAP + FOOTER_HEIGHT

  return {
    width: Math.max(140, width),
    height: Math.max(120, height),
  }
}

export function getBlockBounds(block: Block): { x: number; y: number; width: number; height: number } {
  if (block.type === 'seating') {
    const size = getSeatingBlockSize(block)
    return {
      x: block.x,
      y: block.y,
      width: size.width,
      height: size.height,
    }
  }

  return {
    x: block.x,
    y: block.y,
    width: block.width ?? (block.decorationType === 'gap' ? 220 : 170),
    height: block.height ?? (block.decorationType === 'gap' ? 110 : 90),
  }
}
