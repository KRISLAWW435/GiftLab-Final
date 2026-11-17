import type {
  ConstellationProject,
  ConstellationStar,
  DeviceLayoutKey,
  RecipientPhase,
} from '../types/project';

export type EditableCardTarget =
  | 'text'
  | 'illustration'
  | 'decor'
  | 'card'
  | 'constellation'
  | 'envelope';

export type EditableTextField =
  | 'title'
  | 'recipientName'
  | 'senderName'
  | 'finalMessage'
  | 'occasionLabel'
  | 'starTitle'
  | 'starMessage'
  | 'envelopeKicker'
  | 'envelopeHeadline'
  | 'envelopeHint'
  | 'envelopeCta';

export interface PreviewJumpTarget {
  nonce: number;
  phase: 'sealed' | 'starStory' | 'constellation';
  starIndex?: number;
}

export type ParentToIframeMessage = {
  source: 'giftlab-preview-host';
  type: 'sync';
  project: ConstellationProject;
  deviceMode?: DeviceLayoutKey;
  editMode: boolean;
  selectedTarget: EditableCardTarget | null;
  jumpTo?: PreviewJumpTarget | null;
};

export type IframeToParentMessage =
  | {
      source: 'giftlab-preview-iframe';
      type: 'ready';
      phase: RecipientPhase;
      activeIndex: number;
    }
  | {
      source: 'giftlab-preview-iframe';
      type: 'state';
      phase: RecipientPhase;
      activeIndex: number;
    }
  | {
      source: 'giftlab-preview-iframe';
      type: 'selectTarget';
      target: EditableCardTarget | null;
      field?: EditableTextField;
    }
  | {
      source: 'giftlab-preview-iframe';
      type: 'patchStar';
      starId: string;
      patch: Partial<ConstellationStar>;
    }
  | {
      source: 'giftlab-preview-iframe';
      type: 'patchProject';
      patch: Partial<ConstellationProject>;
    };
