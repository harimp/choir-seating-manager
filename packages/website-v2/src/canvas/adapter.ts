import type { CameraState } from '@choir-seating-manager/shared-v2'
import type { Stage } from 'konva/lib/Stage'

export interface Point {
  x: number
  y: number
}

export interface CanvasAdapter {
  attachStage(stage: Stage | null): void
  getCamera(): CameraState
  setCamera(next: CameraState): void
  panBy(delta: Point): CameraState
  zoomBy(delta: number): CameraState
  zoomAtPoint(point: Point, delta: number): CameraState
}
