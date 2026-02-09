import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { Vector2d } from 'konva/lib/types'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Stage as KonvaStage } from 'konva/lib/Stage'
import type {
  ActiveProfile,
  Block,
  ChoirConfig,
  ChoirSection,
  DecorationBlock,
  RosterMember,
  SeatingBlock,
} from '@choir-seating-manager/shared-v2'
import { ZOOM_STEP } from './config/camera'
import { KonvaCanvasAdapter } from './canvas/konvaAdapter'
import {
  createSeatsForBlock,
  getGridSizeFromBlockDimensions,
  getSeatLayout,
  getSeatingBlockSize,
} from './canvas/seatingLayout'
import { getBlockDimensions, normalizeZIndices, reorderBlock, snapBlockPosition } from './canvas/blockGeometry'
import { createInitialProfileStoreState } from './state/profileStore'
import './App.css'

const RESIZE_HANDLE_RADIUS = 10
const MIN_BLOCK_WIDTH = 120
const MIN_BLOCK_HEIGHT = 80

function createBlockId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

interface SelectedSeatRef {
  blockId: string
  seatIndex: number
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function findMemberByName(roster: RosterMember[], name: string): RosterMember | undefined {
  const normalizedTarget = normalizeName(name).toLowerCase()
  return roster.find((member) => member.name.trim().toLowerCase() === normalizedTarget)
}

function updateChoirConfig(profile: ActiveProfile, updater: (config: ChoirConfig) => ChoirConfig): ActiveProfile {
  return {
    ...profile,
    choirConfig: updater(profile.choirConfig),
  }
}

function toDisplayLabel(value: string): string {
  const normalized = value.trim().replace(/\s+/g, '')
  if (normalized.length === 0) {
    return '??'
  }

  return Array.from(normalized).slice(0, 4).join('')
}

function App() {
  const initialState = useMemo(() => createInitialProfileStoreState(), [])
  const [activeProfile, setActiveProfile] = useState<ActiveProfile>(initialState.activeProfile)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [selectedSeatRef, setSelectedSeatRef] = useState<SelectedSeatRef | null>(null)
  const [assignmentInput, setAssignmentInput] = useState('')
  const [assignmentSectionId, setAssignmentSectionId] = useState('')
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionColor, setNewSectionColor] = useState('#5a71e8')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberSectionId, setNewMemberSectionId] = useState('')
  const [status, setStatus] = useState('Phase 3 roster MVP ready: manage sections, roster, and seat assignment input.')
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

  const stageRef = useRef<KonvaStage | null>(null)
  const adapterRef = useRef(new KonvaCanvasAdapter())
  const adapter = adapterRef.current

  useEffect(() => {
    const handleResize = (): void => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const selectedBlock = useMemo(
    () => activeProfile.blocks.find((block) => block.id === selectedBlockId) ?? null,
    [activeProfile.blocks, selectedBlockId],
  )
  const sectionById = useMemo(
    () => new Map(activeProfile.choirConfig.sections.map((section) => [section.id, section])),
    [activeProfile.choirConfig.sections],
  )
  const rosterById = useMemo(
    () => new Map(activeProfile.choirConfig.roster.map((member) => [member.id, member])),
    [activeProfile.choirConfig.roster],
  )

  const assignedSeatCount = useMemo(
    () =>
      activeProfile.blocks.reduce((total, block) => {
        if (block.type !== 'seating') {
          return total
        }

        return total + block.seats.filter((seat) => seat.assignment).length
      }, 0),
    [activeProfile.blocks],
  )

  const selectedSeatingBlock = selectedBlock?.type === 'seating' ? selectedBlock : null
  const selectedGapBlock =
    selectedBlock?.type === 'decoration' && selectedBlock.decorationType === 'gap' ? selectedBlock : null

  const selectedSeat = useMemo(() => {
    if (!selectedSeatRef || selectedSeatRef.blockId !== selectedSeatingBlock?.id) {
      return null
    }

    const seat = selectedSeatingBlock.seats[selectedSeatRef.seatIndex]
    if (!seat) {
      return null
    }

    return {
      ...selectedSeatRef,
      seat,
      rosterMember: seat.assignment ? rosterById.get(seat.assignment.rosterMemberId) : undefined,
    }
  }, [selectedSeatRef, selectedSeatingBlock, rosterById])

  const updateSeatingBlock = (blockId: string, updater: (block: SeatingBlock) => SeatingBlock): void => {
    setActiveProfile((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => {
        if (block.id !== blockId || block.type !== 'seating') {
          return block
        }

        const updated = updater(block)
        const rows = Math.max(1, Math.floor(updated.rows))
        const columns = Math.max(1, Math.floor(updated.columns))
        const normalized: SeatingBlock = {
          ...updated,
          rows,
          columns,
        }

        return {
          ...normalized,
          seats: createSeatsForBlock(normalized, block.seats),
        }
      }),
    }))
  }

  const updateDecorationBlock = (blockId: string, updater: (block: DecorationBlock) => DecorationBlock): void => {
    setActiveProfile((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => {
        if (block.id !== blockId || block.type !== 'decoration') {
          return block
        }

        return updater(block)
      }),
    }))
  }

  const updateSeatAssignment = (blockId: string, seatIndex: number, rosterMemberId?: string): void => {
    setActiveProfile((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => {
        if (block.id !== blockId || block.type !== 'seating') {
          return block
        }

        const seats = block.seats.length > 0 ? [...block.seats] : createSeatsForBlock(block)
        const currentSeat = seats[seatIndex]
        if (!currentSeat) {
          return block
        }

        seats[seatIndex] = {
          ...currentSeat,
          assignment: rosterMemberId ? { rosterMemberId } : undefined,
        }

        return {
          ...block,
          seats,
        }
      }),
    }))
  }

  const clearMemberAssignments = (rosterMemberId: string): void => {
    setActiveProfile((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => {
        if (block.type !== 'seating') {
          return block
        }

        return {
          ...block,
          seats: block.seats.map((seat) =>
            seat.assignment?.rosterMemberId === rosterMemberId
              ? {
                  ...seat,
                  assignment: undefined,
                }
              : seat,
          ),
        }
      }),
    }))
  }

  const createRosterMember = (name: string, preferredSectionId: string): RosterMember | undefined => {
    const normalized = normalizeName(name)
    if (!normalized) {
      return undefined
    }

    const existing = findMemberByName(activeProfile.choirConfig.roster, normalized)
    if (existing) {
      return existing
    }

    const now = new Date().toISOString()
    const sectionId = preferredSectionId || (activeProfile.choirConfig.sections[0]?.id ?? '')
    const member: RosterMember = {
      id: createBlockId('member'),
      name: normalized,
      sectionId,
      createdAt: now,
      updatedAt: now,
    }

    setActiveProfile((prev) => updateChoirConfig(prev, (config) => ({ ...config, roster: [...config.roster, member] })))
    return member
  }

  const handleAssignFromInput = (): void => {
    if (!selectedSeatingBlock || !selectedSeatRef) {
      setStatus('Select a seat first.')
      return
    }

    const normalizedName = normalizeName(assignmentInput)
    if (!normalizedName) {
      updateSeatAssignment(selectedSeatRef.blockId, selectedSeatRef.seatIndex)
      setStatus('Seat assignment cleared.')
      return
    }

    let member: RosterMember | undefined = findMemberByName(activeProfile.choirConfig.roster, normalizedName)
    if (!member) {
      member = createRosterMember(normalizedName, assignmentSectionId)
      if (!member) {
        setStatus('Assignment name is required.')
        return
      }
      setStatus(`Added ${member.name} to roster and assigned seat.`)
    } else {
      setStatus(`Assigned seat to ${member.name}.`)
    }

    updateSeatAssignment(selectedSeatRef.blockId, selectedSeatRef.seatIndex, member.id)
  }

  const handleSeatSelection = (blockId: string, seatIndex: number): void => {
    const block = activeProfile.blocks.find((candidate) => candidate.id === blockId)
    if (!block || block.type !== 'seating') {
      return
    }

    setSelectedBlockId(blockId)
    setSelectedSeatRef({ blockId, seatIndex })

    const seat = block.seats[seatIndex]
    const member = seat?.assignment ? rosterById.get(seat.assignment.rosterMemberId) : undefined
    setAssignmentInput(member?.name ?? '')
    setAssignmentSectionId(member?.sectionId ?? activeProfile.choirConfig.sections[0]?.id ?? '')
    setStatus(`Seat ${seat?.label ?? seatIndex + 1} selected.`)
  }

  const handleAddSection = (): void => {
    const normalizedName = normalizeName(newSectionName)
    if (!normalizedName) {
      setStatus('Section name is required.')
      return
    }

    const duplicate = activeProfile.choirConfig.sections.some(
      (section) => section.name.trim().toLowerCase() === normalizedName.toLowerCase(),
    )

    if (duplicate) {
      setStatus('Section name already exists.')
      return
    }

    const section: ChoirSection = {
      id: createBlockId('section'),
      name: normalizedName,
      color: newSectionColor,
      order: activeProfile.choirConfig.sections.length,
    }

    setActiveProfile((prev) =>
      updateChoirConfig(prev, (config) => ({
        ...config,
        sections: [...config.sections, section],
      })),
    )
    setNewSectionName('')
    setNewMemberSectionId(section.id)
    setAssignmentSectionId(section.id)
    setStatus(`Section ${section.name} added.`)
  }

  const handleRemoveSection = (sectionId: string): void => {
    setActiveProfile((prev) =>
      updateChoirConfig(prev, (config) => {
        const remainingSections = config.sections.filter((section) => section.id !== sectionId)
        const fallbackSectionId = remainingSections[0]?.id ?? ''

        return {
          ...config,
          sections: remainingSections.map((section, index) => ({ ...section, order: index })),
          roster: config.roster.map((member) =>
            member.sectionId === sectionId
              ? {
                  ...member,
                  sectionId: fallbackSectionId,
                  updatedAt: new Date().toISOString(),
                }
              : member,
          ),
        }
      }),
    )

    setStatus('Section removed and affected members reassigned.')
  }

  const handleAddRosterMember = (): void => {
    const member = createRosterMember(newMemberName, newMemberSectionId)
    if (!member) {
      setStatus('Member name is required.')
      return
    }

    setNewMemberName('')
    setStatus(`${member.name} added to roster.`)
  }

  const handleRemoveRosterMember = (memberId: string): void => {
    setActiveProfile((prev) =>
      updateChoirConfig(prev, (config) => ({
        ...config,
        roster: config.roster.filter((member) => member.id !== memberId),
      })),
    )
    clearMemberAssignments(memberId)
    setStatus('Roster member removed and seat assignments cleared.')
  }

  const createSeatingBlock = (): SeatingBlock => {
    const nextZ = activeProfile.blocks.length
    const base: SeatingBlock = {
      id: createBlockId('block-seating'),
      type: 'seating',
      name: `Grid Block ${nextZ + 1}`,
      x: 120 + nextZ * 28,
      y: 120 + nextZ * 20,
      zIndex: nextZ,
      rotation: 0,
      layout: 'grid',
      rows: 3,
      columns: 4,
      seats: [],
    }

    return {
      ...base,
      seats: createSeatsForBlock(base),
    }
  }

  const createGapBlock = (): DecorationBlock => {
    const nextZ = activeProfile.blocks.length
    return {
      id: createBlockId('block-gap'),
      type: 'decoration',
      name: `Gap Marker ${nextZ + 1}`,
      x: 220 + nextZ * 24,
      y: 170 + nextZ * 20,
      zIndex: nextZ,
      rotation: 0,
      decorationType: 'gap',
      text: 'Aisle Gap',
      color: '#ffe4a8',
    }
  }

  const addBlock = (block: Block, createdMessage: string): void => {
    setActiveProfile((prev) => ({
      ...prev,
      blocks: [...prev.blocks, block],
    }))
    setSelectedBlockId(block.id)
    setSelectedSeatRef(null)
    setStatus(createdMessage)
  }

  const handleZoomIn = (): void => {
    const nextCamera = adapter.zoomBy(ZOOM_STEP)
    setActiveProfile((prev) => ({ ...prev, camera: nextCamera }))
  }

  const handleZoomOut = (): void => {
    const nextCamera = adapter.zoomBy(-ZOOM_STEP)
    setActiveProfile((prev) => ({ ...prev, camera: nextCamera }))
  }

  const handleStageRef = (node: KonvaStage | null): void => {
    stageRef.current = node
    adapter.attachStage(node)
    if (node) {
      adapter.setCamera(activeProfile.camera)
    }
  }

  const handleReorderSelected = (direction: 'forward' | 'backward'): void => {
    if (!selectedBlockId) {
      setStatus('Select a block first to change z-order.')
      return
    }

    setActiveProfile((prev) => ({
      ...prev,
      blocks: reorderBlock(prev.blocks, selectedBlockId, direction),
    }))
    setStatus(direction === 'forward' ? 'Selected block moved forward.' : 'Selected block moved backward.')
  }

  const clearSelection = (): void => {
    setSelectedBlockId(null)
    setSelectedSeatRef(null)
    setStatus('Selection cleared.')
  }

  const handleWheel = (event: KonvaEventObject<WheelEvent>): void => {
    event.evt.preventDefault()
    const pointer = stageRef.current?.getPointerPosition()
    if (!pointer) {
      return
    }

    const nextCamera = adapter.zoomAtPoint(pointer, event.evt.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)
    setActiveProfile((prev) => ({ ...prev, camera: nextCamera }))
  }

  const handleStageDragEnd = (): void => {
    const stage = stageRef.current
    if (!stage) {
      return
    }

    const nextCamera = {
      ...activeProfile.camera,
      x: stage.x(),
      y: stage.y(),
      zoom: stage.scaleX(),
    }

    adapter.setCamera(nextCamera)
    setActiveProfile((prev) => ({ ...prev, camera: nextCamera }))
  }

  const handleBlockDragMove = (blockId: string, event: KonvaEventObject<DragEvent>): void => {
    const target = event.target
    const proposed = { x: target.x(), y: target.y() }

    setActiveProfile((prev) => {
      const snapped = snapBlockPosition({
        movingBlockId: blockId,
        proposedPosition: proposed,
        blocks: prev.blocks,
      })

      target.position(snapped)

      return {
        ...prev,
        blocks: prev.blocks.map((block) =>
          block.id === blockId
            ? {
                ...block,
                x: snapped.x,
                y: snapped.y,
              }
            : block,
        ),
      }
    })
  }

  const handleBlockResize = (blockId: string, proposedWidth: number, proposedHeight: number): void => {
    const width = Math.max(MIN_BLOCK_WIDTH, proposedWidth)
    const height = Math.max(MIN_BLOCK_HEIGHT, proposedHeight)

    setActiveProfile((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => {
        if (block.id !== blockId) {
          return block
        }

        if (block.type === 'seating') {
          const { rows, columns } = getGridSizeFromBlockDimensions(width, height)
          const resized: SeatingBlock = {
            ...block,
            rows,
            columns,
          }

          return {
            ...resized,
            seats: createSeatsForBlock(resized, block.seats),
          }
        }

        return {
          ...block,
          width,
          height,
        }
      }),
    }))
  }

  const handleAssignmentDragEnd = (
    block: SeatingBlock,
    fromSeatIndex: number,
    event: KonvaEventObject<DragEvent>,
  ): void => {
    event.cancelBubble = true
    const seatPoints = getSeatLayout(block)
    const originPoint = seatPoints[fromSeatIndex]
    const size = getSeatingBlockSize(block)
    const tokenNode = event.target
    const droppedAt = { x: tokenNode.x(), y: tokenNode.y() }

    const insideBlock =
      droppedAt.x >= 0 && droppedAt.x <= size.width && droppedAt.y >= 0 && droppedAt.y <= size.height

    if (!insideBlock) {
      tokenNode.position({ x: originPoint.x, y: originPoint.y })
      setStatus('Assignment drag canceled: outside block bounds.')
      return
    }

    let closestSeatIndex = -1
    let closestDistance = Number.POSITIVE_INFINITY

    seatPoints.forEach((point) => {
      const distance = Math.hypot(point.x - droppedAt.x, point.y - droppedAt.y)
      if (distance < closestDistance) {
        closestDistance = distance
        closestSeatIndex = point.seatIndex
      }
    })

    if (closestSeatIndex < 0) {
      tokenNode.position({ x: originPoint.x, y: originPoint.y })
      return
    }

    const targetPoint = seatPoints[closestSeatIndex]
    tokenNode.position({ x: targetPoint.x, y: targetPoint.y })

    setActiveProfile((prev) => ({
      ...prev,
      blocks: prev.blocks.map((candidate) => {
        if (candidate.id !== block.id || candidate.type !== 'seating') {
          return candidate
        }

        const seats = [...candidate.seats]
        const sourceAssignment = seats[fromSeatIndex]?.assignment
        const targetAssignment = seats[closestSeatIndex]?.assignment

        if (!sourceAssignment) {
          return candidate
        }

        seats[fromSeatIndex] = {
          ...seats[fromSeatIndex],
          assignment: targetAssignment,
        }

        seats[closestSeatIndex] = {
          ...seats[closestSeatIndex],
          assignment: sourceAssignment,
        }

        return {
          ...candidate,
          seats,
        }
      }),
    }))

    setStatus('Seat assignment updated.')
  }

  const renderedBlocks = useMemo(
    () => [...normalizeZIndices(activeProfile.blocks)].sort((a, b) => a.zIndex - b.zIndex),
    [activeProfile.blocks],
  )
  const displayTitle = activeProfile.choirConfig.title.trim() || 'Choir Seating Manager v2'

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>): void => {
    if (event.target === stageRef.current) {
      clearSelection()
    }
  }

  return (
    <div className="app">
      <Stage
        width={viewport.width}
        height={viewport.height}
        ref={handleStageRef}
        className="canvas-stage"
        draggable
        onMouseDown={handleStageMouseDown}
        onDragEnd={handleStageDragEnd}
        onWheel={handleWheel}
      >
        <Layer>
          <Rect x={-3000} y={-3000} width={6000} height={6000} fill="#f8f8fb" listening={false} />
          <Text
            x={24}
            y={24}
            text={`${displayTitle}${activeProfile.choirConfig.showMemberCount ? ` (${assignedSeatCount} assigned)` : ''}`}
            fill="#223"
            fontSize={18}
            fontStyle="bold"
            listening={false}
          />
          <Text
            x={24}
            y={48}
            text={`Phase 3 Member MVP | Zoom: ${activeProfile.camera.zoom.toFixed(2)} | Blocks: ${activeProfile.blocks.length}`}
            fill="#334"
            fontSize={14}
            listening={false}
          />

          {renderedBlocks.map((block) => {
            const dimensions = getBlockDimensions(block)
            const isSelected = block.id === selectedBlockId

            if (block.type === 'decoration') {
              return (
                <Group
                  key={block.id}
                  x={block.x}
                  y={block.y}
                  draggable
                  onClick={() => {
                    setSelectedBlockId(block.id)
                    setSelectedSeatRef(null)
                    setStatus(`${block.name ?? 'Gap marker'} selected.`)
                  }}
                  onDragMove={(event) => {
                    handleBlockDragMove(block.id, event)
                  }}
                >
                  <Rect
                    x={0}
                    y={0}
                    width={dimensions.width}
                    height={dimensions.height}
                    cornerRadius={10}
                    fill={block.color ?? '#ffe4a8'}
                    stroke={isSelected ? '#b26c00' : '#d2951f'}
                    strokeWidth={isSelected ? 3 : 1.5}
                  />
                  <Text x={12} y={12} text={block.name ?? 'Gap Marker'} fill="#4d2b00" fontSize={14} />
                  <Text x={12} y={36} text={block.text ?? 'Gap'} fill="#6b3c00" fontSize={13} />
                  <Group
                    x={dimensions.width}
                    y={dimensions.height}
                    draggable
                    onMouseDown={(event) => {
                      event.cancelBubble = true
                    }}
                    onDragStart={(event) => {
                      event.cancelBubble = true
                    }}
                    onDragMove={(event) => {
                      event.cancelBubble = true
                      handleBlockResize(block.id, event.target.x(), event.target.y())
                    }}
                    onDragEnd={(event) => {
                      event.cancelBubble = true
                      handleBlockResize(block.id, event.target.x(), event.target.y())
                      setStatus('Block resized.')
                    }}
                  >
                    <Circle
                      x={0}
                      y={0}
                      radius={RESIZE_HANDLE_RADIUS}
                      fill={isSelected ? '#a76300' : '#b3832f'}
                      stroke="#fff8"
                      strokeWidth={1.5}
                    />
                    <Line points={[-4, 3, 3, -4]} stroke="#fff" strokeWidth={1.4} listening={false} />
                    <Line points={[-7, 6, 6, -7]} stroke="#fffb" strokeWidth={1.1} listening={false} />
                  </Group>
                </Group>
              )
            }

            const seats = block.seats.length > 0 ? block.seats : createSeatsForBlock(block)
            const seatPoints = getSeatLayout(block)

            return (
              <Group
                key={block.id}
                x={block.x}
                y={block.y}
                draggable
                onClick={() => {
                  setSelectedBlockId(block.id)
                  setSelectedSeatRef(null)
                  setStatus(`${block.name ?? 'Seating block'} selected.`)
                }}
                onDragMove={(event) => {
                  handleBlockDragMove(block.id, event)
                }}
              >
                <Rect
                  x={0}
                  y={0}
                  width={dimensions.width}
                  height={dimensions.height}
                  cornerRadius={12}
                  fill="#f8faff"
                  stroke={isSelected ? '#5a6be6' : '#c7d0ea'}
                  strokeWidth={isSelected ? 2.5 : 1}
                />
                <Text
                  x={12}
                  y={12}
                  text={`${block.name ?? 'Seating'} · ${block.rows}x${block.columns}`}
                  fill="#6a7396"
                  fontSize={12}
                />

                {seatPoints.map((seatPoint) => {
                  const seat = seats[seatPoint.seatIndex]
                  const assignment = seat?.assignment
                  const bounds = getSeatingBlockSize(block)

                  return (
                    <Fragment key={seat.id}>
                      <Circle
                        x={seatPoint.x}
                        y={seatPoint.y}
                        radius={20}
                        fill={assignment ? '#d8def4' : '#eef2fb'}
                        opacity={1}
                        stroke={assignment ? '#7c8dbf' : '#c6d0ea'}
                        strokeWidth={1.2}
                        onClick={(event) => {
                          event.cancelBubble = true
                          handleSeatSelection(block.id, seatPoint.seatIndex)
                        }}
                      />
                      {selectedSeat?.blockId === block.id && selectedSeat.seatIndex === seatPoint.seatIndex ? (
                        <Circle
                          x={seatPoint.x}
                          y={seatPoint.y}
                          radius={24}
                          stroke="#2b4eff"
                          strokeWidth={2}
                          listening={false}
                        />
                      ) : null}
                      {assignment ? (
                        <>
                          {(() => {
                            const member = rosterById.get(assignment.rosterMemberId)
                            const sectionColor = member ? sectionById.get(member.sectionId)?.color : undefined
                            return (
                              <Circle
                                x={seatPoint.x}
                                y={seatPoint.y}
                                radius={18}
                                fill={sectionColor ?? '#3550d8'}
                                stroke="#1f2f80"
                                strokeWidth={1}
                                draggable
                                dragBoundFunc={(pos: Vector2d) => ({
                                  x: Math.min(bounds.width, Math.max(0, pos.x)),
                                  y: Math.min(bounds.height, Math.max(0, pos.y)),
                                })}
                                onClick={(event) => {
                                  event.cancelBubble = true
                                  handleSeatSelection(block.id, seatPoint.seatIndex)
                                }}
                                onDragStart={(event) => {
                                  event.cancelBubble = true
                                }}
                                onDragMove={(event) => {
                                  event.cancelBubble = true
                                }}
                                onDragEnd={(event) => {
                                  handleAssignmentDragEnd(block, seatPoint.seatIndex, event)
                                }}
                              />
                            )
                          })()}
                          <Text
                            x={seatPoint.x - 16}
                            y={seatPoint.y - 7}
                            text={toDisplayLabel(rosterById.get(assignment.rosterMemberId)?.name ?? assignment.rosterMemberId)}
                            fill="#fff"
                            fontSize={11}
                            fontStyle="bold"
                            listening={false}
                            width={32}
                            align="center"
                          />
                        </>
                      ) : null}
                    </Fragment>
                  )
                })}
                <Group
                  x={dimensions.width}
                  y={dimensions.height}
                  draggable
                  onMouseDown={(event) => {
                    event.cancelBubble = true
                  }}
                  onDragStart={(event) => {
                    event.cancelBubble = true
                  }}
                  onDragMove={(event) => {
                    event.cancelBubble = true
                    handleBlockResize(block.id, event.target.x(), event.target.y())
                  }}
                  onDragEnd={(event) => {
                    event.cancelBubble = true
                    handleBlockResize(block.id, event.target.x(), event.target.y())
                    setStatus('Block resized.')
                  }}
                >
                  <Circle
                    x={0}
                    y={0}
                    radius={RESIZE_HANDLE_RADIUS}
                    fill={isSelected ? '#4054e6' : '#6676c7'}
                    stroke="#fff8"
                    strokeWidth={1.5}
                  />
                  <Line points={[-4, 3, 3, -4]} stroke="#fff" strokeWidth={1.4} listening={false} />
                  <Line points={[-7, 6, 6, -7]} stroke="#fffb" strokeWidth={1.1} listening={false} />
                </Group>
              </Group>
            )
          })}
        </Layer>
      </Stage>

      <div className="controls floating-panel">
        <div className="title-row">
          <h1>🎵 Choir Seating Manager v2</h1>
          <span className="beta-badge">BETA</span>
        </div>
        <button onClick={() => addBlock(createSeatingBlock(), 'Added grid seating block.')} type="button">
          Add Grid Block
        </button>
        <button onClick={() => addBlock(createGapBlock(), 'Added gap marker block.')} type="button">
          Add Gap Marker
        </button>
        <button onClick={() => handleReorderSelected('backward')} type="button">Send Backward</button>
        <button onClick={() => handleReorderSelected('forward')} type="button">Bring Forward</button>
        <button onClick={handleZoomOut} type="button">Zoom Out</button>
        <button onClick={handleZoomIn} type="button">Zoom In</button>
      </div>

      <div className="status floating-panel">
        <p>{status}</p>
        <p className="sub">Tip: drag empty canvas to pan, drag blocks to snap, drag seat tokens to reassign, click a seat to edit assignment.</p>
      </div>

      <aside className="inspector floating-panel">
              <h3>Inspector</h3>

              {selectedBlock ? (
                <>

              <section className="inspector-section">
                <h4>Choir Settings</h4>
                <label>
                  Title
                  <input
                    type="text"
                    value={activeProfile.choirConfig.title}
                    onChange={(event) => {
                      const title = event.target.value
                      setActiveProfile((prev) => updateChoirConfig(prev, (config) => ({ ...config, title })))
                    }}
                  />
                </label>
                <label className="inline-row">
                  <input
                    type="checkbox"
                    checked={activeProfile.choirConfig.showMemberCount}
                    onChange={(event) => {
                      const showMemberCount = event.target.checked
                      setActiveProfile((prev) =>
                        updateChoirConfig(prev, (config) => ({
                          ...config,
                          showMemberCount,
                        })),
                      )
                    }}
                  />
                  Show assigned member count
                </label>
                <p className="muted">Assigned seats in current snapshot: {assignedSeatCount}</p>
              </section>

              <section className="inspector-section">
                <h4>Sections</h4>
                <div className="list-block">
                  {activeProfile.choirConfig.sections.length === 0 ? (
                    <p className="muted">No sections yet.</p>
                  ) : (
                    activeProfile.choirConfig.sections.map((section) => (
                      <div key={section.id} className="list-row">
                        <span className="color-dot" style={{ backgroundColor: section.color }} />
                        <span>{section.name}</span>
                        <button type="button" onClick={() => handleRemoveSection(section.id)}>
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <label>
                  New Section Name
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(event) => {
                      setNewSectionName(event.target.value)
                    }}
                    placeholder="Soprano"
                  />
                </label>
                <label>
                  Section Color
                  <input
                    type="color"
                    value={newSectionColor}
                    onChange={(event) => {
                      setNewSectionColor(event.target.value)
                    }}
                  />
                </label>
                <button type="button" onClick={handleAddSection}>Add Section</button>
              </section>

              <section className="inspector-section">
                <h4>Roster</h4>
                <div className="list-block">
                  {activeProfile.choirConfig.roster.length === 0 ? (
                    <p className="muted">No members yet.</p>
                  ) : (
                    activeProfile.choirConfig.roster.map((member) => (
                      <div key={member.id} className="list-row">
                        <span>{member.name}</span>
                        <span className="muted">{sectionById.get(member.sectionId)?.name ?? 'No section'}</span>
                        <button type="button" onClick={() => handleRemoveRosterMember(member.id)}>
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <label>
                  New Member Name
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(event) => {
                      setNewMemberName(event.target.value)
                    }}
                    placeholder="Alex Kim"
                  />
                </label>
                <label>
                  Member Section
                  <select
                    value={newMemberSectionId}
                    onChange={(event) => {
                      setNewMemberSectionId(event.target.value)
                    }}
                  >
                    <option value="">No section</option>
                    {activeProfile.choirConfig.sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={handleAddRosterMember}>Add Member</button>
              </section>

              {selectedBlock ? (
                <label>
                  Name
                  <input
                    type="text"
                    value={selectedBlock.name ?? ''}
                    onChange={(event) => {
                      const name = event.target.value
                      if (selectedBlock.type === 'seating') {
                        updateSeatingBlock(selectedBlock.id, (block) => ({ ...block, name }))
                      } else {
                        updateDecorationBlock(selectedBlock.id, (block) => ({ ...block, name }))
                      }
                    }}
                  />
                </label>
              ) : null}

              {selectedSeatingBlock ? (
                <>
                  <section className="inspector-section">
                    <h4>Seat Assignment</h4>
                    {selectedSeat ? (
                      <>
                        <p className="muted">Selected seat: {selectedSeat.seat.label ?? selectedSeat.seatIndex + 1}</p>
                        <label>
                          Member Name
                          <input
                            type="text"
                            list="roster-member-suggestions"
                            value={assignmentInput}
                            onChange={(event) => {
                              setAssignmentInput(event.target.value)
                            }}
                            placeholder="Type to assign or add new"
                          />
                          <datalist id="roster-member-suggestions">
                            {activeProfile.choirConfig.roster.map((member) => (
                              <option key={member.id} value={member.name} />
                            ))}
                          </datalist>
                        </label>
                        <label>
                          Section for new names
                          <select
                            value={assignmentSectionId}
                            onChange={(event) => {
                              setAssignmentSectionId(event.target.value)
                            }}
                          >
                            <option value="">No section</option>
                            {activeProfile.choirConfig.sections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="inline-actions">
                          <button type="button" onClick={handleAssignFromInput}>Assign / Add</button>
                          <button
                            type="button"
                            onClick={() => {
                              setAssignmentInput('')
                              handleAssignFromInput()
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="muted">Click a seat to assign a member.</p>
                    )}
                  </section>

                  <label>
                    Rows
                    <input
                      type="number"
                      min={1}
                      value={selectedSeatingBlock.rows}
                      onChange={(event) => {
                        updateSeatingBlock(selectedSeatingBlock.id, (block) => ({
                          ...block,
                          rows: Number(event.target.value) || 1,
                        }))
                      }}
                    />
                  </label>

                  <label>
                    Columns
                    <input
                      type="number"
                      min={1}
                      value={selectedSeatingBlock.columns}
                      onChange={(event) => {
                        updateSeatingBlock(selectedSeatingBlock.id, (block) => ({
                          ...block,
                          columns: Number(event.target.value) || 1,
                        }))
                      }}
                    />
                  </label>

                  <button
                    className="danger"
                    type="button"
                    onClick={() => {
                      const confirmed = window.confirm(
                        'Reset this seating block layout and assignments? This cannot be undone.',
                      )

                      if (!confirmed) {
                        return
                      }

                      updateSeatingBlock(selectedSeatingBlock.id, (block) => {
                        const reset: SeatingBlock = {
                          ...block,
                          rows: 3,
                          columns: 4,
                        }

                        return {
                          ...reset,
                          seats: createSeatsForBlock(reset),
                        }
                      })

                      setStatus('Layout reset completed.')
                    }}
                  >
                    Reset Layout
                  </button>
                </>
              ) : null}

              {selectedGapBlock ? (
                <>
                  <label>
                    Marker Text
                    <input
                      type="text"
                      value={selectedGapBlock.text ?? ''}
                      onChange={(event) => {
                        const text = event.target.value
                        updateDecorationBlock(selectedGapBlock.id, (block) => ({ ...block, text }))
                      }}
                    />
                  </label>

                  <label>
                    Marker Color
                    <input
                      type="color"
                      value={selectedGapBlock.color ?? '#ffe4a8'}
                      onChange={(event) => {
                        const color = event.target.value
                        updateDecorationBlock(selectedGapBlock.id, (block) => ({ ...block, color }))
                      }}
                    />
                  </label>
                </>
              ) : null}
                </>
              ) : (
                <p className="muted">No selection. Click a block or seat to open configuration.</p>
              )}
      </aside>
    </div>
  )
}

export default App
