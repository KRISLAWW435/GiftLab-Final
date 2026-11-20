import { describe, expect, test } from 'bun:test';
import {
  applyCardThemeToProject,
  computeEnvelopeScreenGeometry,
  computeFinalLetterPresentation,
  computeStoryCardPresentation,
  computeStoryFlexSpacers,
  createNewProject,
  resolveCardColors,
  resolveContrastSafeCardTextColor,
  resolveSafeCardDecorPresentation,
} from '../src/scene/paletteConfig';

describe('cardPresentation & themes', () => {
  test('computeStoryCardPresentation enforces contrast-safe ink on legacy light minimalist theme', () => {
    const project = applyCardThemeToProject(createNewProject('birthday'), 'minimalist');
    const star = {
      ...project.stars[0],
      textStyle: {
        ...project.stars[0].textStyle!,
        color: '#FFFFFF',
      },
    };

    const pres = computeStoryCardPresentation(project, star, {
      device: 'desktop',
      viewportWidth: 1280,
      isPortrait: false,
      isCompactLandscape: false,
    });

    expect(pres.isMinimalistTheme).toBe(true);
    expect(pres.cardColors.isLightPaper).toBe(true);
    expect(pres.effectiveTextColor).toBe(pres.cardColors.textColor);
    expect(pres.effectiveShadowMode).toBe('none');
  });

  test('resolveContrastSafeCardTextColor keeps custom text color when custom surface/text set', () => {
    const project = {
      cardTheme: 'minimalist' as const,
      cardColors: { surfaceBg: '#12131A', textColor: '#F8FAFC' },
    };
    const colors = resolveCardColors(project);
    expect(colors.isLightPaper).toBe(false);
    expect(resolveContrastSafeCardTextColor('#F8FAFC', project, colors)).toBe('#F8FAFC');
  });

  test('computeStoryCardPresentation distinguishes phone portrait vs desktop alignment and widths', () => {
    const project = createNewProject('mothers_day');
    const star = project.stars[0];

    const phonePres = computeStoryCardPresentation(project, star, {
      device: 'phone',
      viewportWidth: 390,
      isPortrait: true,
      isCompactLandscape: false,
    });
    const desktopPres = computeStoryCardPresentation(project, star, {
      device: 'desktop',
      viewportWidth: 1440,
      isPortrait: false,
      isCompactLandscape: false,
    });

    expect(phonePres.effectiveAlign).toBe('center');
    expect(desktopPres.effectiveAlign).toBe('left');
    expect(phonePres.storyWidthClass).toBe('max-w-[374px]');
    expect(desktopPres.storyWidthClass).toBe('max-w-xl');
    expect(phonePres.effectiveIlluPx).toBeLessThan(desktopPres.effectiveIlluPx);
  });

  test('computeStoryFlexSpacers respects top, center, and spread alignments', () => {
    const top = computeStoryFlexSpacers('top', 0, 0, false);
    const center = computeStoryFlexSpacers('center', 0, 0, false);
    const spread = computeStoryFlexSpacers('spread', 0, 0, false);

    expect(top.topOuterGrow).toBeLessThan(center.topOuterGrow);
    expect(top.bottomInnerGrow).toBeGreaterThan(center.bottomInnerGrow);
    expect(spread.topInnerGrow).toBeGreaterThan(center.topInnerGrow);
  });

  test('resolveSafeCardDecorPresentation pulls center decor into perimeter in viewer mode', () => {
    const centerDecor = { motif: 'sparkles' as const, xPct: 52, yPct: 48, scale: 1.2 };

    const editSafe = resolveSafeCardDecorPresentation(centerDecor, {
      editMode: true,
      textLength: 400,
      compactViewport: true,
    });
    expect(editSafe.xPct).toBe(52);
    expect(editSafe.yPct).toBe(48);

    const viewSafe = resolveSafeCardDecorPresentation(centerDecor, {
      editMode: false,
      textLength: 400,
      compactViewport: true,
    });
    expect(viewSafe.xPct).toBe(90);
    expect(viewSafe.yPct).toBe(13);
    expect(viewSafe.scale).toBeLessThan(centerDecor.scale);
    expect(viewSafe.opacity).toBe(0.56);
  });

  test('computeFinalLetterPresentation adapts widths and typography per device', () => {
    const project = applyCardThemeToProject(createNewProject('new_year'), 'cosmic_card');
    const phoneFinal = computeFinalLetterPresentation(project, {
      device: 'phone',
      isPortrait: true,
      isCompactLandscape: false,
    });
    const desktopFinal = computeFinalLetterPresentation(project, {
      device: 'desktop',
      isPortrait: false,
      isCompactLandscape: false,
    });

    expect(phoneFinal.isFrostedDark).toBe(true);
    expect(phoneFinal.widthClass).toContain('390px');
    expect(desktopFinal.widthClass).toContain('540px');
    expect(desktopFinal.bodyPx).toBeGreaterThanOrEqual(phoneFinal.bodyPx);
  });

  test('computeEnvelopeScreenGeometry clamps aspect and reflects user scale/offset', () => {
    const project = {
      recipientName: 'Аня',
      title: 'Звёзды',
      envelopeSettings: {
        phoneScale: 1.3,
        desktopScale: 0.9,
        phoneOffsetY: 20,
        desktopOffsetY: -10,
        phoneTextOffsetY: 15,
        desktopTextOffsetY: -20,
        phoneFooterOffsetY: -40,
        desktopFooterOffsetY: 15,
      },
    };

    const phoneGeom = computeEnvelopeScreenGeometry(project, 390, 844, 'phone', true);
    const desktopGeom = computeEnvelopeScreenGeometry(project, 1280, 720, 'desktop', false);

    expect(phoneGeom.userScale).toBe(1.3);
    expect(desktopGeom.userScale).toBe(0.9);
    expect(phoneGeom.boxW).toBeGreaterThan(0);
    expect(phoneGeom.boxH).toBeGreaterThan(0);
    expect(phoneGeom.screenOffsetYPx).toBeGreaterThan(0);
    expect(desktopGeom.screenOffsetYPx).toBeLessThan(0);
    expect(phoneGeom.textTranslateYPx).toBeGreaterThan(0);
    expect(desktopGeom.textTranslateYPx).toBeLessThan(0);
    expect(phoneGeom.footerTranslateYPx).toBeLessThan(0);
    expect(desktopGeom.footerTranslateYPx).toBeGreaterThan(0);
  });
});
