import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import {
  getFinalMessageSuggestions,
  getToneBadgeLabel,
  isPresetOrSuggestedFinalMessage,
} from '../../scene/starSuggestions';
import type { OccasionId } from '../../types/project';

interface FinalMessageIdeasProps {
  occasion: OccasionId;
  recipientName?: string;
  currentMessage: string;
  onSelectMessage: (nextMessage: string) => void;
}

export function FinalMessageIdeas({
  occasion,
  recipientName,
  currentMessage,
  onSelectMessage,
}: FinalMessageIdeasProps) {
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  useEffect(() => {
    setPendingConfirm(null);
  }, [occasion, recipientName]);

  const suggestions = getFinalMessageSuggestions(occasion, recipientName);
  const toneBadge = getToneBadgeLabel(occasion, recipientName);

  const handleSelectSuggestion = (suggestedText: string) => {
    const clean = suggestedText.slice(0, 800);
    if (
      currentMessage.trim() === clean.trim() ||
      isPresetOrSuggestedFinalMessage(currentMessage)
    ) {
      onSelectMessage(clean);
      setPendingConfirm(null);
    } else {
      setPendingConfirm(clean);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] overflow-hidden">
      <button
        type="button"
        data-testid="final-message-ideas-toggle"
        aria-expanded={ideasOpen}
        onClick={() => setIdeasOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-white/[0.04] transition-colors cursor-pointer min-h-[38px]"
      >
        <span className="inline-flex items-center gap-2 text-left">
          <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>Не знаешь, что написать? Посмотри идеи</span>
        </span>
        {ideasOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-gl-text-muted shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gl-text-muted shrink-0" />
        )}
      </button>

      {(ideasOpen || pendingConfirm) && (
        <div className="border-t border-white/10 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-gl-text-muted">Готовые заготовки</span>
            <span className="inline-flex items-center rounded-full border border-gl-accent/35 bg-gl-accent/15 px-2 py-0.5 text-[10px] font-medium text-gl-accent-light">
              {toneBadge}
            </span>
          </div>

          {pendingConfirm && (
            <div className="rounded-xl border border-amber-300/45 bg-amber-500/12 p-2.5 space-y-2 text-xs">
              <p className="text-amber-100 leading-snug">
                В финальном послании уже написан твой текст. Заменить его выбранной заготовкой?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectMessage(pendingConfirm);
                    setPendingConfirm(null);
                  }}
                  className="gl-btn-primary !min-h-[34px] !px-2.5 text-xs"
                >
                  Заменить
                </button>
                <button
                  type="button"
                  onClick={() => setPendingConfirm(null)}
                  className="gl-btn-secondary !min-h-[34px] !px-2.5 text-xs"
                >
                  Оставить свой
                </button>
              </div>
            </div>
          )}

          {ideasOpen && (
            <div className="space-y-1.5">
              {suggestions.map((item) => {
                const active = currentMessage.trim() === item.text.trim();
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`final-message-idea-${item.id}`}
                    data-selected={active}
                    onClick={() => handleSelectSuggestion(item.text)}
                    className="gl-choice w-full text-left px-3 py-2 space-y-0.5"
                  >
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-gl-accent-light">
                      {item.tag}
                    </span>
                    <p className="text-xs text-gl-text leading-relaxed">{item.text}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
