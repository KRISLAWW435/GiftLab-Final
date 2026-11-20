import type React from 'react';
import { useId } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import type { EditableTextField } from '../../preview/previewProtocol';
import type { FinalLetterDragKind } from '../FinalLetterCard';

export type StoryNavigationIntent =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'index'; index: number }
  | { type: 'constellation' };

export interface SwipeGestureState {
  active: boolean;
  pointerId: number | null;
  pointerType: string;
  startX: number;
  startY: number;
  hasHorizontalIntent: boolean;
}

export const INITIAL_SWIPE_STATE: SwipeGestureState = {
  active: false,
  pointerId: null,
  pointerType: '',
  startX: 0,
  startY: 0,
  hasHorizontalIntent: false,
};

export const SWIPE_MIN_DISTANCE_PX = 65;
export const SWIPE_HORIZONTAL_RATIO = 1.35;

export type CanvasEditDragKind =
  | 'text-move'
  | 'text-resize-right'
  | 'text-resize-left'
  | 'text-resize-nw'
  | 'text-resize-ne'
  | 'text-resize-sw'
  | 'text-resize-se'
  | 'card-resize-nw'
  | 'card-resize-ne'
  | 'card-resize-sw'
  | 'card-resize-se'
  | 'story-card-move'
  | 'illu-move'
  | 'illu-scale'
  | 'constellation-move'
  | 'envelope-move'
  | 'envelope-text-move'
  | 'envelope-footer-move'
  | 'envelope-resize-nw'
  | 'envelope-resize-ne'
  | 'envelope-resize-sw'
  | 'envelope-resize-se'
  | FinalLetterDragKind;

export interface CanvasEditDragState {
  kind: CanvasEditDragKind;
  pointerId: number;
  startX: number;
  startY: number;
  containerW: number;
  containerH: number;
  originX: number;
  originY: number;
  originValue: number;
  originFontSize?: number;
  originCardW?: number;
  originCardH?: number;
  starId?: string;
  hasMoved: boolean;
  pendingInlineField?: EditableTextField;
}

export type CanvasEditDragHandlers = {
  beginCanvasEdit: (kind: CanvasEditDragKind, e: React.PointerEvent<HTMLElement>) => void;
  moveCanvasEdit: (e: React.PointerEvent<HTMLElement>) => void;
  endCanvasEdit: (e: React.PointerEvent<HTMLElement>) => void;
};

export function shouldIgnoreSwipeTarget(
  target: EventTarget | null,
  pointerType: string,
): boolean {
  if (!(target instanceof Element)) return false;
  if (
    target.closest(
      'button, a, input, textarea, select, [role="button"], [data-no-swipe="true"]',
    )
  ) {
    return true;
  }
  if (
    pointerType === 'mouse' &&
    target.closest('[data-selectable-text="true"]')
  ) {
    return true;
  }
  return false;
}

export function hasActiveTextSelection(): boolean {
  if (typeof window === 'undefined' || !window.getSelection) return false;
  const sel = window.getSelection();
  return Boolean(sel && !sel.isCollapsed && sel.toString().trim().length > 0);
}

export function SmallProgressStarIcon({ lit, active }: { lit: boolean; active: boolean }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `gl-prog-cry-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={`gl-icon-3d transition-transform duration-200 ${
        active ? 'w-5 h-5 scale-110' : 'w-4 h-4'
      }`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="3" y1="2" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#e879f9" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.2l2.9 5.88 6.48.94-4.69 4.57 1.1 6.46L12 17l-5.79 3.05 1.1-6.46L2.62 9.02l6.48-.94L12 2.2z"
        fill={lit ? `url(#${gradId})` : 'rgba(255,255,255,0.08)'}
        stroke={lit ? 'rgba(255,255,255,0.92)' : 'currentColor'}
        strokeWidth={lit ? '1.1' : '1.45'}
        strokeLinejoin="round"
      />
      {lit && (
        <>
          <polygon points="12,2.2 9.1,8.08 2.62,9.02 12,12" fill="rgba(255,255,255,0.48)" />
          <circle cx="12" cy="12" r="2.2" fill="#ffffff" />
        </>
      )}
    </svg>
  );
}

export function RecipientFullscreenButton({
  isFullscreen,
  onToggle,
  pillStyle = false,
}: {
  isFullscreen: boolean;
  onToggle: () => void;
  pillStyle?: boolean;
}) {
  const label = isFullscreen ? 'Выйти из полного экрана' : 'На весь экран';
  const icon = isFullscreen ? (
    <Minimize className="w-3.5 h-3.5 shrink-0" />
  ) : (
    <Maximize className="w-3.5 h-3.5 shrink-0" />
  );

  if (pillStyle) {
    return (
      <button
        type="button"
        data-testid="recipient-fullscreen-btn"
        data-fullscreen-toggle="true"
        onClick={onToggle}
        aria-pressed={isFullscreen}
        aria-label={label}
        title={label}
        className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border backdrop-blur-md bg-[#0b0816]/60 border-white/25 text-white hover:bg-[#0b0816]/80 hover:border-white/45 transition-all shadow-lg cursor-pointer shrink-0"
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid="recipient-fullscreen-btn"
      data-fullscreen-toggle="true"
      onClick={onToggle}
      aria-pressed={isFullscreen}
      aria-label={label}
      title={label}
      className="gl-btn-secondary !bg-gl-panel/85 hover:!bg-gl-card text-gl-text !w-9 !h-9 !min-h-[36px] !p-0 flex items-center justify-center shrink-0"
    >
      {icon}
    </button>
  );
}
