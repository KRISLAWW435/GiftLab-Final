import { describe, expect, test } from 'bun:test';
import {
  OCCASION_PRESETS,
  applyCompositionPreset,
  buildProjectCardDevicePatch,
  buildStarTextDevicePatch,
  computeNextStarSpawnPosition,
  createNewProject,
  normalizeProject,
  resetDeviceLayoutInProject,
  resolveEffectiveCardLayout,
  resolveEffectiveStarTextStyle,
  resolveEnvelopeSettings,
  resolveViewportDeviceMode,
  sanitizeConnections,
} from '../src/scene/paletteConfig';
import {
  getFinalMessageSuggestions,
  isPresetOrSuggestedFinalMessage,
} from '../src/scene/starSuggestions';
import {
  isStarComplete,
  isStarUnsignedAndEmpty,
  type ConstellationProject,
} from '../src/types/project';

describe('projectFactory & deviceLayouts', () => {
  test('createNewProject initializes stars, connections, and both device layouts', () => {
    const project = createNewProject('birthday', '  Для тебя  ', ' Маша ', 'heart');

    expect(project.title).toBe('Для тебя');
    expect(project.recipientName).toBe('Маша');
    expect(project.composition).toBe('heart');
    expect(project.stars.length).toBeGreaterThanOrEqual(5);
    expect(project.connections.length).toBeGreaterThan(0);
    expect(project.deviceLayouts?.phone).toBeDefined();
    expect(project.deviceLayouts?.desktop).toBeDefined();
    expect(project.stars.every(isStarComplete)).toBe(true);
    expect(project.stars.some(isStarUnsignedAndEmpty)).toBe(false);

    const mothersPreset = OCCASION_PRESETS.find((p) => p.id === 'mothers_day');
    expect(mothersPreset?.defaultRecipient).toBe('Любимой мамы');
    const mothersProject = createNewProject('mothers_day');
    expect(resolveEnvelopeSettings(mothersProject).kickerText).toBe('Для Любимой мамы');
  });

  test('isStarComplete treats filled stars (even legacy isDraft) as complete and detects unsigned/empty stars', () => {
    const project = createNewProject('birthday');
    const baseStar = project.stars[0];

    expect(isStarComplete({ ...baseStar, isDraft: true })).toBe(true);
    expect(isStarUnsignedAndEmpty({ ...baseStar, isDraft: true })).toBe(false);

    const genericEmpty = { ...baseStar, title: 'Звезда 6', message: '   ' };
    expect(isStarComplete(genericEmpty)).toBe(false);
    expect(isStarUnsignedAndEmpty(genericEmpty)).toBe(true);

    const blankEmpty = { ...baseStar, title: '', message: '' };
    expect(isStarComplete(blankEmpty)).toBe(false);
    expect(isStarUnsignedAndEmpty(blankEmpty)).toBe(true);

    const titledEmpty = { ...baseStar, title: 'Мечта', message: '' };
    expect(isStarComplete(titledEmpty)).toBe(false);
    expect(isStarUnsignedAndEmpty(titledEmpty)).toBe(false);
  });

  test('getFinalMessageSuggestions returns deduplicated suggestions and distinguishes presets from custom text', () => {
    const suggestions = getFinalMessageSuggestions('birthday', 'Маша');
    expect(suggestions.length).toBeGreaterThanOrEqual(4);
    const texts = suggestions.map((s) => s.text.trim());
    expect(new Set(texts).size).toBe(texts.length);
    for (const s of suggestions) {
      expect(s.tag.trim().length).toBeGreaterThan(0);
      expect(s.text.trim().length).toBeGreaterThan(0);
      expect(isPresetOrSuggestedFinalMessage(s.text)).toBe(true);
    }

    expect(isPresetOrSuggestedFinalMessage('')).toBe(true);
    expect(
      isPresetOrSuggestedFinalMessage('Моё собственное уникальное поздравление от всей души!'),
    ).toBe(false);
  });

  test('sanitizeConnections drops self-loops, unknown stars, and undirected duplicates', () => {
    const stars = [{ id: 's1' }, { id: 's2' }, { id: 's3' }];
    const clean = sanitizeConnections(
      [
        { id: 'c1', from: 's1', to: 's2' },
        { id: 'c2', from: 's2', to: 's1' }, // duplicate reverse
        { id: 'c3', from: 's1', to: 's1' }, // self-loop
        { id: 'c4', from: 's1', to: 'missing' }, // dangling
        { id: 'c5', from: 's2', to: 's3' },
      ],
      stars,
    );

    expect(clean).toHaveLength(2);
    expect(clean.map((c) => [c.from, c.to])).toEqual([
      ['s1', 's2'],
      ['s2', 's3'],
    ]);
  });

  test('normalizeProject migrates legacy light ink on minimalist cardTheme', () => {
    const base = createNewProject('birthday');
    const legacy: ConstellationProject = {
      ...base,
      cardTheme: 'minimalist',
      cardColors: undefined,
      finalTextStyle: {
        fontId: 'lora',
        fontWeight: 'normal',
        fontSize: 17,
        textAlign: 'auto',
        color: '#FFFFFF',
        shadow: 'soft',
        lineHeight: 1.6,
        accent: 'line',
        offsetX: 0,
        offsetY: 0,
        widthPct: 100,
      },
    };

    const normalized = normalizeProject(legacy);
    expect(normalized.finalTextStyle?.color).toBe('#171923');
    expect(normalized.finalTextStyle?.shadow).toBe('none');
  });

  test('buildStarTextDevicePatch isolates phone vs desktop geometry while sharing typography', () => {
    const project = createNewProject('mothers_day');
    const star = project.stars[0];

    const patch = buildStarTextDevicePatch(star, 'phone', {
      widthPct: 64,
      offsetX: 25,
      color: '#FDE68A',
    });
    const updatedStar = { ...star, ...patch };

    const phoneText = resolveEffectiveStarTextStyle(updatedStar, 'phone');
    const desktopText = resolveEffectiveStarTextStyle(updatedStar, 'desktop');

    expect(phoneText.widthPct).toBe(64);
    expect(phoneText.offsetX).toBe(25);
    expect(desktopText.widthPct).toBe(100);
    expect(desktopText.offsetX).toBe(0);
    expect(desktopText.color).toBe('#FDE68A');
  });

  test('resetDeviceLayoutInProject resets only the specified device layout', () => {
    const project = createNewProject('birthday');
    const editedPhone = {
      ...project,
      ...buildProjectCardDevicePatch(project, 'phone', { padding: 'spacious', scale: 0.75 }),
    };
    const editedBoth = {
      ...editedPhone,
      ...buildProjectCardDevicePatch(editedPhone, 'desktop', { padding: 'compact', scale: 1.15 }),
    };

    const resetPhone = resetDeviceLayoutInProject(editedBoth, 'phone');
    expect(resolveEffectiveCardLayout(resetPhone, 'phone').padding).toBe('compact');
    expect(resolveEffectiveCardLayout(resetPhone, 'phone').scale).toBe(1);
    expect(resolveEffectiveCardLayout(resetPhone, 'desktop').padding).toBe('compact');
    expect(resolveEffectiveCardLayout(resetPhone, 'desktop').scale).toBe(1.15);
  });

  test('computeNextStarSpawnPosition respects bounds and avoids overlap', () => {
    const project = createNewProject('birthday');
    const pos = computeNextStarSpawnPosition(project.stars, project.stars.length);

    expect(Math.abs(pos.x)).toBeLessThanOrEqual(7.4);
    expect(Math.abs(pos.y)).toBeLessThanOrEqual(4.6);
    expect(Math.abs(pos.z)).toBeLessThanOrEqual(3.4);
  });

  test('applyCompositionPreset builds flower connections and resolveViewportDeviceMode detects phone', () => {
    const project = createNewProject('birthday');
    const flower = applyCompositionPreset(project.stars, 'flower');
    expect(flower.stars).toHaveLength(project.stars.length);
    expect(flower.connections.length).toBeGreaterThanOrEqual(project.stars.length - 1);

    expect(resolveViewportDeviceMode(390, 844)).toBe('phone');
    expect(resolveViewportDeviceMode(844, 390)).toBe('phone');
    expect(resolveViewportDeviceMode(1280, 720)).toBe('desktop');
  });
});
