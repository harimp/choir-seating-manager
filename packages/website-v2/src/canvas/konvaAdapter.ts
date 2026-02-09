import type { Stage } from 'konva/lib/Stage'
import type { CameraState } from '@choir-seating-manager/shared-v2'
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from '../config/camera'
import type { CanvasAdapter, Point } from './adapter'

export class KonvaCanvasAdapter implements CanvasAdapter {
  private stage: Stage | null = null

  private camera: CameraState = {
    x: 0,
    y: 0,
    zoom: DEFAULT_ZOOM,
  }

  constructor(stageRef?: Stage | null) {
    this.attachStage(stageRef ?? null)
  }

  attachStage(stage: Stage | null): void {
    this.stage = stage
    this.syncStage()
  }

  getCamera(): CameraState {
    return this.camera
  }

  setCamera(next: CameraState): void {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next.zoom))
    this.camera = {
      ...next,
      zoom: clampedZoom,
    }

    this.syncStage()
  }

  panBy(delta: Point): CameraState {
    this.setCamera({
      ...this.camera,
      x: this.camera.x + delta.x,
      y: this.camera.y + delta.y,
    })

    return this.camera
  }

  zoomBy(delta: number): CameraState {
    const next = {
      ...this.camera,
      zoom: this.camera.zoom + delta,
    }
    this.setCamera(next)
    return this.camera
  }

  zoomAtPoint(point: Point, delta: number): CameraState {
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.camera.zoom + delta))
    const zoomRatio = nextZoom / this.camera.zoom

    const nextX = point.x - (point.x - this.camera.x) * zoomRatio
    const nextY = point.y - (point.y - this.camera.y) * zoomRatio

    this.setCamera({
      x: nextX,
      y: nextY,
      zoom: nextZoom,
    })

    return this.camera
  }

  private syncStage(): void {
    if (this.stage) {
      this.stage.position({ x: this.camera.x, y: this.camera.y })
      this.stage.scale({ x: this.camera.zoom, y: this.camera.zoom })
      this.stage.batchDraw()
    }
  }
}
