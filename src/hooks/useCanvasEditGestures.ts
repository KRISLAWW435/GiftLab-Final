import type React from 'react';
import { useRef, useState } from 'react';
import type { EditableCardTarget, EditableTextField } from '../preview/previewProtocol';
import type {
  CanvasEditDragKind,
  CanvasEditDragState,
} from '../components/recipient/recipientTypes';
import type { EnvelopeScreenGeometry, StoryCardPresentation } from '../scene/paletteConfig';
import type {
  ConstellationProject,
  ConstellationStar,
  DeviceConstellationLayout,
  DeviceLayoutKey,
  StarTextStyle,
} from '../types/project';
import {
  CANVAS_EDIT_TARGET_MAP,
  computeCanvasEditPatch,
  resolveCanvasDragOrigin,
} from './canvasEditMath';

interface UseCanvasEditGesturesOptions {
  editMode: boolean;
  project: ConstellationProject;
  activeDevice: DeviceLayoutKey;
  isPortrait: boolean;
  viewportWidth: number;
  viewportHeight: number;
  activeStar: ConstellationStar | null | undefined;
  storyPresentation: StoryCardPresentation;
  envelopeGeom: EnvelopeScreenGeometry;
  constellationLayout: DeviceConstellationLayout;
  finalTextStyle: StarTextStyle;
  storyStageRef: React.RefObject<HTMLDivElement | null>;
  finaleHeaderRef: React.RefObject<HTMLElement | null>;
  onSelectTarget?: (target: EditableCardTarget | null, field?: EditableTextField) => void;
  onPatchStar?: (starId: string, patch: Partial<ConstellationStar>) => void;
  onPatchProject?: (patch: Partial<ConstellationProject>) => void;
  onSetActiveInlineField: (field: EditableTextField | null) => void;
}

export function useCanvasEditGestures({
  editMode,
  project,
  activeDevice,
  isPortrait,
  viewportWidth,
  viewportHeight,
  activeStar,
  storyPresentation,
  envelopeGeom,
  constellationLayout,
  finalTextStyle,
  storyStageRef,
  finaleHeaderRef,
  onSelectTarget,
  onPatchStar,
  onPatchProject,
  onSetActiveInlineField,
}: UseCanvasEditGesturesOptions) {
  const dragRef = useRef<CanvasEditDragState | null>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  const beginCanvasEdit = (
    kind: CanvasEditDragKind,
    e: React.PointerEvent<HTMLElement>,
  ) => {
    if (!editMode) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) return;
    e.stopPropagation();

    onSelectTarget?.(CANVAS_EDIT_TARGET_MAP[kind]);

    const isEnvelopeResize = kind.startsWith('envelope-resize-');
    const isEnvelopeDrag =
      isEnvelopeResize ||
      kind === 'envelope-move' ||
      kind === 'envelope-text-move' ||
      kind === 'envelope-footer-move';
    const stageEl =
      kind === 'constellation-move' || isEnvelopeDrag
        ? undefined
        : kind.startsWith('final-')
          ? finaleHeaderRef.current
          : storyStageRef.current;
    const stageRect = stageEl?.getBoundingClientRect();

    const containerW = isEnvelopeResize
      ? Math.max(80, envelopeGeom.boxW)
      : Math.max(160, stageRect?.width ?? viewportWidth);
    const containerH = isEnvelopeResize
      ? Math.max(60, envelopeGeom.boxH)
      : Math.max(140, stageRect?.height ?? viewportHeight);

    const origin = resolveCanvasDragOrigin(kind, {
      starTextStyle: storyPresentation.textStyle,
      finalTextStyle,
      cardLayout: storyPresentation.cardLayout,
      illuLayout: storyPresentation.illuLayout,
      constellationLayout,
      envelopeOffsetY: envelopeGeom.offsetY,
      envelopeTextOffsetY: envelopeGeom.textOffsetY,
      envelopeFooterOffsetY: envelopeGeom.footerOffsetY,
      envelopeUserScale: envelopeGeom.userScale,
    });

    const inlineTargetEl = (e.target as HTMLElement | null)?.closest(
      '[data-inline-field]',
    ) as HTMLElement | null;
    const pendingInlineField = (inlineTargetEl?.getAttribute('data-inline-field') ??
      undefined) as EditableTextField | undefined;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingCanvas(true);
    dragRef.current = {
      kind,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      containerW,
      containerH,
      originX: origin.originX,
      originY: origin.originY,
      originValue: origin.originValue,
      originFontSize: origin.originFontSize,
      starId: activeStar?.id,
      hasMoved: false,
      pendingInlineField,
    };
  };

  const moveCanvasEdit = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.hasMoved) {
      if (Math.hypot(dx, dy) < 4) {
        return;
      }
      drag.hasMoved = true;
      onSetActiveInlineField(null);
    }

    const result = computeCanvasEditPatch(drag, e.clientX, e.clientY, {
      project,
      activeDevice,
      isPortrait,
      activeStar,
    });
    if (!result) return;

    if (result.target === 'project') {
      onPatchProject?.(result.patch);
    } else {
      onPatchStar?.(result.starId, result.patch);
    }
  };

  const endCanvasEdit = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setIsDraggingCanvas(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    if (!drag.hasMoved && drag.pendingInlineField) {
      onSetActiveInlineField(drag.pendingInlineField);
      onSelectTarget?.(
        drag.kind === 'envelope-text-move' || drag.kind === 'envelope-footer-move'
          ? 'envelope'
          : 'text',
        drag.pendingInlineField,
      );
    }
  };

  return {
    isDraggingCanvas,
    beginCanvasEdit,
    moveCanvasEdit,
    endCanvasEdit,
  };
}
