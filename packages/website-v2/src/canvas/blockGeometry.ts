import type { Block } from '@choir-seating-manager/shared-v2'
import { getBlockBounds } from './seatingLayout'

export interface BlockDimensions {
  width: number
  height: number
}

export interface BlockPosition {
  x: number
  y: number
}

export const SNAP_THRESHOLD_PX = 14

export function getBlockDimensions(block: Block): BlockDimensions {
  const bounds = getBlockBounds(block)
  return {
    width: bounds.width,
    height: bounds.height,
  }
}

function getEdgeValues(position: BlockPosition, dimensions: BlockDimensions): {
  left: number
  right: number
  top: number
  bottom: number
} {
  return {
    left: position.x,
    right: position.x + dimensions.width,
    top: position.y,
    bottom: position.y + dimensions.height,
  }
}

export function snapBlockPosition(args: {
  movingBlockId: string
  proposedPosition: BlockPosition
  blocks: Block[]
  snapThreshold?: number
}): BlockPosition {
  const movingBlock = args.blocks.find((block) => block.id === args.movingBlockId)
  if (!movingBlock) {
    return args.proposedPosition
  }

  const movingDimensions = getBlockDimensions(movingBlock)
  const movingEdges = getEdgeValues(args.proposedPosition, movingDimensions)
  const threshold = args.snapThreshold ?? SNAP_THRESHOLD_PX

  let bestDx = 0
  let bestDy = 0
  let bestDxDistance = Number.POSITIVE_INFINITY
  let bestDyDistance = Number.POSITIVE_INFINITY

  for (const candidate of args.blocks) {
    if (candidate.id === args.movingBlockId) {
      continue
    }

    const candidateDimensions = getBlockDimensions(candidate)
    const candidateEdges = getEdgeValues({ x: candidate.x, y: candidate.y }, candidateDimensions)

    const xComparisons = [
      candidateEdges.left - movingEdges.left,
      candidateEdges.left - movingEdges.right,
      candidateEdges.right - movingEdges.left,
      candidateEdges.right - movingEdges.right,
    ]

    for (const deltaX of xComparisons) {
      const distance = Math.abs(deltaX)
      if (distance <= threshold && distance < bestDxDistance) {
        bestDxDistance = distance
        bestDx = deltaX
      }
    }

    const yComparisons = [
      candidateEdges.top - movingEdges.top,
      candidateEdges.top - movingEdges.bottom,
      candidateEdges.bottom - movingEdges.top,
      candidateEdges.bottom - movingEdges.bottom,
    ]

    for (const deltaY of yComparisons) {
      const distance = Math.abs(deltaY)
      if (distance <= threshold && distance < bestDyDistance) {
        bestDyDistance = distance
        bestDy = deltaY
      }
    }
  }

  return {
    x: args.proposedPosition.x + bestDx,
    y: args.proposedPosition.y + bestDy,
  }
}

export function normalizeZIndices(blocks: Block[]): Block[] {
  const sorted = [...blocks].sort((a, b) => a.zIndex - b.zIndex)
  const zById = new Map<string, number>()

  sorted.forEach((block, index) => {
    zById.set(block.id, index)
  })

  return blocks.map((block) => ({
    ...block,
    zIndex: zById.get(block.id) ?? block.zIndex,
  }))
}

export function reorderBlock(blocks: Block[], blockId: string, direction: 'forward' | 'backward'): Block[] {
  const sorted = [...blocks].sort((a, b) => a.zIndex - b.zIndex)
  const currentIndex = sorted.findIndex((block) => block.id === blockId)

  if (currentIndex < 0) {
    return blocks
  }

  const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1
  if (nextIndex < 0 || nextIndex >= sorted.length) {
    return blocks
  }

  const swapped = [...sorted]
  const current = swapped[currentIndex]
  swapped[currentIndex] = swapped[nextIndex]
  swapped[nextIndex] = current

  const normalized = swapped.map((block, index) => ({
    ...block,
    zIndex: index,
  }))

  const zById = new Map<string, number>()
  normalized.forEach((block) => zById.set(block.id, block.zIndex))

  return blocks.map((block) => ({
    ...block,
    zIndex: zById.get(block.id) ?? block.zIndex,
  }))
}
