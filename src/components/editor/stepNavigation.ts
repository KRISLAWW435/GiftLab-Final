import type { RecipientPhase } from '../../types/project';
import type { WorkshopStepId } from '../EditorLayout';

export type StepNavigationAction =
  | { kind: 'step'; step: WorkshopStepId }
  | { kind: 'cardView'; phase: 'sealed' | 'starStory' | 'constellation'; starIndex?: number }
  | { kind: 'none' };

export function resolveCardStepNext(
  cardPhase: RecipientPhase,
  cardStarIndex: number,
  starsCount: number,
): StepNavigationAction {
  if (cardPhase === 'sealed') {
    if (starsCount > 0) {
      return { kind: 'cardView', phase: 'starStory', starIndex: 0 };
    }
    return { kind: 'cardView', phase: 'constellation' };
  }

  if (cardPhase === 'starStory') {
    const safeIdx = Math.max(0, Math.min(Math.max(0, starsCount - 1), cardStarIndex));
    if (safeIdx < starsCount - 1) {
      return { kind: 'cardView', phase: 'starStory', starIndex: safeIdx + 1 };
    }
    return { kind: 'cardView', phase: 'constellation' };
  }

  return { kind: 'step', step: 'preview' };
}

export function resolveCardStepPrev(
  cardPhase: RecipientPhase,
  cardStarIndex: number,
  starsCount: number,
): StepNavigationAction {
  if (cardPhase === 'constellation' || cardPhase === 'finalReveal') {
    if (starsCount > 0) {
      return { kind: 'cardView', phase: 'starStory', starIndex: starsCount - 1 };
    }
    return { kind: 'cardView', phase: 'sealed' };
  }

  if (cardPhase === 'starStory') {
    if (cardStarIndex > 0) {
      return { kind: 'cardView', phase: 'starStory', starIndex: cardStarIndex - 1 };
    }
    return { kind: 'cardView', phase: 'sealed' };
  }

  return { kind: 'step', step: 'constellation' };
}
