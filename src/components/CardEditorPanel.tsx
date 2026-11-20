import { Frame, Image as ImageIcon, LayoutTemplate, Type } from 'lucide-react';
import type { EditableCardTarget, EditableTextField } from '../preview/previewProtocol';
import type {
  ConstellationProject,
  ConstellationStar,
  RecipientPhase,
} from '../types/project';
import { CardLibraryPanel } from './CardLibraryPanel';
import { CardLayoutEditorSection } from './cardEditor/CardLayoutEditorSection';
import { EnvelopeEditorSection } from './cardEditor/EnvelopeEditorSection';
import { IllustrationEditorSection } from './cardEditor/IllustrationEditorSection';
import { TextEditorSection } from './cardEditor/TextEditorSection';
import type { PreviewDeviceId } from './LivePreviewStage';

export type CardEditorTab = 'theme' | 'text' | 'illustration' | 'card';

interface CardEditorPanelProps {
  project: ConstellationProject;
  device: PreviewDeviceId;
  cardPhase: RecipientPhase;
  cardStarIndex: number;
  activeTab: CardEditorTab;
  focusedField?: EditableTextField | null;
  onChangeTab: (tab: CardEditorTab, target?: EditableCardTarget) => void;
  onSelectCardTargetView: (
    phase: 'sealed' | 'constellation' | 'starStory',
    starIndex?: number,
  ) => void;
  onPatchProject: (patch: Partial<ConstellationProject>) => void;
  onPatchStar: (starId: string, patch: Partial<ConstellationStar>) => void;
  onResetDeviceLayout: (nextProject: ConstellationProject) => void;
}

const CARD_EDITOR_TABS: Array<{
  id: CardEditorTab;
  label: string;
  icon: typeof LayoutTemplate;
  target: EditableCardTarget;
}> = [
  { id: 'theme', label: 'Темы', icon: LayoutTemplate, target: 'card' },
  { id: 'text', label: 'Текст', icon: Type, target: 'text' },
  { id: 'illustration', label: 'Фото', icon: ImageIcon, target: 'illustration' },
  { id: 'card', label: 'Макет', icon: Frame, target: 'card' },
];

export function CardEditorPanel({
  project,
  device,
  cardPhase,
  cardStarIndex,
  activeTab,
  focusedField = null,
  onChangeTab,
  onSelectCardTargetView,
  onPatchProject,
  onPatchStar,
  onResetDeviceLayout,
}: CardEditorPanelProps) {
  const isEnvelopePhase = cardPhase === 'sealed';
  const isFinaleCard = cardPhase === 'constellation' || cardPhase === 'finalReveal';
  const safeStarIndex = Math.max(
    0,
    Math.min(Math.max(0, project.stars.length - 1), cardStarIndex),
  );
  const activeStar = project.stars[safeStarIndex] ?? project.stars[0];

  return (
    <div className="space-y-3.5">
      {/* 4 Clean Card Editing Tabs (shown when editing Final Card or Star Cards) */}
      {!isEnvelopePhase && (
        <div
          data-testid="card-editor-tabs"
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 grid grid-cols-4 gap-1"
        >
          {CARD_EDITOR_TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`card-tab-${tab.id}`}
                data-selected={selected}
                onClick={() => {
                  onChangeTab(tab.id, tab.target);
                  if (tab.id === 'illustration' && isFinaleCard) {
                    onSelectCardTargetView('starStory', safeStarIndex);
                  }
                }}
                className="gl-tab !min-h-[42px] !px-1 !py-1.5 flex flex-col items-center justify-center gap-0.5 text-[11px]"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-full">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ENVELOPE MODE: Customization of the Sealed Greeting Screen */}
      {isEnvelopePhase && (
        <EnvelopeEditorSection
          project={project}
          device={device}
          focusedField={focusedField}
          onPatchProject={onPatchProject}
          onSelectCardTargetView={onSelectCardTargetView}
        />
      )}

      {/* TAB 1: Темы и цвета открытки */}
      {!isEnvelopePhase && activeTab === 'theme' && (
        <CardLibraryPanel
          project={project}
          onChange={onPatchProject}
          compact
        />
      )}

      {/* TAB 2: Тексты и оформление */}
      {!isEnvelopePhase && activeTab === 'text' && (
        <TextEditorSection
          project={project}
          device={device}
          isFinaleCard={isFinaleCard}
          activeStar={activeStar}
          safeStarIndex={safeStarIndex}
          focusedField={focusedField}
          onSelectCardTargetView={onSelectCardTargetView}
          onPatchProject={onPatchProject}
          onPatchStar={onPatchStar}
        />
      )}

      {/* TAB 3: Иллюстрация и загрузка фото на открытку */}
      {!isEnvelopePhase && activeTab === 'illustration' && activeStar && (
        <IllustrationEditorSection
          projectId={project.id}
          activeStar={activeStar}
          safeStarIndex={safeStarIndex}
          isFinaleCard={isFinaleCard}
          device={device}
          onSelectCardTargetView={onSelectCardTargetView}
          onPatchStar={onPatchStar}
        />
      )}

      {/* TAB 4: Макет и размеры открытки */}
      {!isEnvelopePhase && activeTab === 'card' && (
        <CardLayoutEditorSection
          project={project}
          device={device}
          onPatchProject={onPatchProject}
          onResetDeviceLayout={onResetDeviceLayout}
        />
      )}
    </div>
  );
}
