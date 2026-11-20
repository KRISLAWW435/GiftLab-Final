import { describe, expect, it } from 'bun:test';
import {
  resolveCardStepNext,
  resolveCardStepPrev,
} from '../src/components/editor/stepNavigation';
import {
  COSMIC_PALETTES,
  ENVELOPE_COLOR_SWATCHES,
  ENVELOPE_MOTIFS,
  ENVELOPE_SHAPES,
  GLOW_COLORS,
  SEAL_COLOR_SWATCHES,
  clampEnvelopeGlowIntensity,
  computeEnvelopeFooterTranslateYPx,
  getEnvelope2DSvgSpec,
  getEnvelopeMotifSvgElements,
  getHexLuminance,
  resolveEnvelopeFooterOffsetY,
  resolveEnvelopeGlowFactors,
  resolveEnvelopeGlowIntensity,
  resolveEnvelopePaletteColors,
  resolveEnvelopeSettings,
  resolveSealPaletteColors,
  sanitizeEnvelopeSettings,
} from '../src/scene/paletteConfig';
import type { EnvelopeSettings } from '../src/types/project';

describe('Step 3 sequential navigation', () => {
  it('advances sequentially: sealed -> stars 0..N-1 -> finale -> preview', () => {
    expect(resolveCardStepNext('sealed', 0, 5)).toEqual({
      kind: 'cardView',
      phase: 'starStory',
      starIndex: 0,
    });
    expect(resolveCardStepNext('starStory', 0, 5)).toEqual({
      kind: 'cardView',
      phase: 'starStory',
      starIndex: 1,
    });
    expect(resolveCardStepNext('starStory', 3, 5)).toEqual({
      kind: 'cardView',
      phase: 'starStory',
      starIndex: 4,
    });
    expect(resolveCardStepNext('starStory', 4, 5)).toEqual({
      kind: 'cardView',
      phase: 'constellation',
    });
    expect(resolveCardStepNext('constellation', 4, 5)).toEqual({
      kind: 'step',
      step: 'preview',
    });
    expect(resolveCardStepNext('finalReveal', 4, 5)).toEqual({
      kind: 'step',
      step: 'preview',
    });
  });

  it('steps backward symmetrically: finale -> stars N-1..0 -> sealed -> constellation step', () => {
    expect(resolveCardStepPrev('constellation', 0, 5)).toEqual({
      kind: 'cardView',
      phase: 'starStory',
      starIndex: 4,
    });
    expect(resolveCardStepPrev('starStory', 4, 5)).toEqual({
      kind: 'cardView',
      phase: 'starStory',
      starIndex: 3,
    });
    expect(resolveCardStepPrev('starStory', 1, 5)).toEqual({
      kind: 'cardView',
      phase: 'starStory',
      starIndex: 0,
    });
    expect(resolveCardStepPrev('starStory', 0, 5)).toEqual({
      kind: 'cardView',
      phase: 'sealed',
    });
    expect(resolveCardStepPrev('sealed', 0, 5)).toEqual({
      kind: 'step',
      step: 'constellation',
    });
  });

  it('handles zero stars gracefully without skipping finale', () => {
    expect(resolveCardStepNext('sealed', 0, 0)).toEqual({
      kind: 'cardView',
      phase: 'constellation',
    });
    expect(resolveCardStepPrev('constellation', 0, 0)).toEqual({
      kind: 'cardView',
      phase: 'sealed',
    });
  });
});

describe('Envelope shape, motif, footer offset, and contrast color helpers', () => {
  it('sanitizes and resolves shapes and motifs with safe defaults and legacy fallback', () => {
    expect(resolveEnvelopeSettings(undefined)).toMatchObject({
      shape: 'classic',
      motif: 'none',
    });

    const sanitized = sanitizeEnvelopeSettings({
      shape: 'rounded',
      motif: 'moon',
      envelopeColor: '#e4dff8',
      sealColor: '#e11d48',
      phoneFooterOffsetY: -42,
      desktopFooterOffsetY: 12,
    });
    expect(sanitized).toEqual({
      shape: 'rounded',
      motif: 'moon',
      envelopeColor: '#E4DFF8',
      sealColor: '#E11D48',
      phoneFooterOffsetY: -42,
      desktopFooterOffsetY: 12,
    });

    // Classic & none omit redundant default fields
    expect(
      sanitizeEnvelopeSettings({
        shape: 'classic',
        motif: 'none',
      }),
    ).toBeUndefined();

    // Legacy removed or invalid enum values fall back safely to classic
    const legacyOrCorrupted = {
      shape: 'royal',
      motif: 'unknown_motif',
    } as unknown as EnvelopeSettings;
    expect(
      resolveEnvelopeSettings({
        title: 'Test',
        recipientName: 'Аня',
        envelopeSettings: legacyOrCorrupted,
      }),
    ).toMatchObject({
      shape: 'classic',
      motif: 'none',
    });
    expect(sanitizeEnvelopeSettings(legacyOrCorrupted)).toBeUndefined();
  });

  it('keeps envelope visibly distinct from all 4 cosmic sky backgrounds and prevents light overexposure', () => {
    for (const palette of Object.values(COSMIC_PALETTES)) {
      const def = resolveEnvelopePaletteColors(undefined, palette);
      expect(getHexLuminance(def.bodyHex)).toBeGreaterThan(
        getHexLuminance(palette.midColor) + 0.08,
      );
      expect(def.flapHex).not.toBe(def.pocketHex);
      expect(def.bodyHex).not.toBe(def.borderHex);
    }

    for (const swatch of ENVELOPE_COLOR_SWATCHES) {
      const custom = resolveEnvelopePaletteColors(swatch.hex, COSMIC_PALETTES.lavender);
      expect(getHexLuminance(custom.bodyHex)).toBeGreaterThan(0.08);
      expect(custom.flapHex).not.toBe(custom.pocketHex);
      expect(custom.motifInkHex).not.toBe(custom.pocketHex);
    }

    // White and bright light envelopes must not emit light or lose fold contrast
    for (const lightHex of ['#FFFFFF', '#F8F6FF', '#E4DFF8']) {
      const lightResolved = resolveEnvelopePaletteColors(lightHex, COSMIC_PALETTES.lavender);
      expect(lightResolved.isLightBody).toBe(true);
      expect(lightResolved.emissiveIntensity).toBe(0);
      expect(lightResolved.emissiveHex).toBe('#000000');
      expect(getHexLuminance(lightResolved.bodyHex)).toBeLessThan(0.88);
      expect(getHexLuminance(lightResolved.bodyHex)).toBeLessThan(getHexLuminance(lightHex));
      expect(
        getHexLuminance(lightResolved.bodyHex) - getHexLuminance(lightResolved.flapHex),
      ).toBeGreaterThan(0.08);
      expect(
        getHexLuminance(lightResolved.flapHex) - getHexLuminance(lightResolved.pocketHex),
      ).toBeGreaterThan(0.08);
      expect(
        getHexLuminance(lightResolved.pocketHex) - getHexLuminance(lightResolved.borderHex),
      ).toBeGreaterThan(0.05);
    }
  });

  it('guarantees strong disc vs star contrast on every seal color swatch and glow default', () => {
    for (const sw of SEAL_COLOR_SWATCHES) {
      const resolved = resolveSealPaletteColors(sw.hex, GLOW_COLORS.gold);
      const discLum = getHexLuminance(resolved.discHex);
      const starLum = getHexLuminance(resolved.starHex);
      expect(Math.abs(discLum - starLum)).toBeGreaterThan(0.28);
      expect(resolved.rimHex).not.toBe(resolved.discHex);
    }

    for (const glow of Object.values(GLOW_COLORS)) {
      const resolved = resolveSealPaletteColors(undefined, glow);
      const discLum = getHexLuminance(resolved.discHex);
      const starLum = getHexLuminance(resolved.starHex);
      expect(Math.abs(discLum - starLum)).toBeGreaterThan(0.28);
    }
  });

  it('provides unique 2D SVG paths for classic and rounded shapes and valid elements for all motifs', () => {
    expect(ENVELOPE_SHAPES.map((s) => s.id)).toEqual(['classic', 'rounded']);
    const flapPaths = new Set(
      ENVELOPE_SHAPES.map((s) => getEnvelope2DSvgSpec(s.id).flapPath),
    );
    expect(flapPaths.size).toBe(2);

    for (const motif of ENVELOPE_MOTIFS) {
      const els = getEnvelopeMotifSvgElements(motif.id);
      if (motif.id === 'none') {
        expect(els.length).toBe(0);
      } else {
        expect(els.length).toBeGreaterThan(0);
      }
    }

    const moonEls = getEnvelopeMotifSvgElements('moon');
    expect(moonEls.length).toBe(3);
    expect(moonEls[0].tag).toBe('path');
    expect(moonEls[0].attrs.d).toContain('C');
    expect(moonEls[1].tag).toBe('polygon');
    expect(moonEls[2].tag).toBe('polygon');
  });

  it('resolves and clamps per-device footer offsets and translates upward/downward cleanly', () => {
    const settings: EnvelopeSettings = {
      phoneFooterOffsetY: -150,
      desktopFooterOffsetY: 35,
    };
    expect(resolveEnvelopeFooterOffsetY(settings, 'phone')).toBe(-100);
    expect(resolveEnvelopeFooterOffsetY(settings, 'desktop')).toBe(20);
    expect(resolveEnvelopeFooterOffsetY(undefined, 'phone')).toBe(0);

    expect(computeEnvelopeFooterTranslateYPx(-50, 800, true)).toBe(-100);
    expect(computeEnvelopeFooterTranslateYPx(20, 800, false)).toBeGreaterThan(0);
    expect(computeEnvelopeFooterTranslateYPx(0, 800, true)).toBe(0);
  });

  it('clamps, sanitizes, and resolves envelope glowIntensity across dimming and boosting', () => {
    expect(resolveEnvelopeGlowIntensity(undefined)).toBe(1);
    expect(clampEnvelopeGlowIntensity(-0.4)).toBe(0);
    expect(clampEnvelopeGlowIntensity(3)).toBe(1.5);
    expect(sanitizeEnvelopeSettings({ glowIntensity: 1 })).toBeUndefined();
    expect(sanitizeEnvelopeSettings({ glowIntensity: 0.35 })).toEqual({
      glowIntensity: 0.35,
    });

    const envColors = resolveEnvelopePaletteColors('#8B72D6', COSMIC_PALETTES.lavender);
    const sealColors = resolveSealPaletteColors('#D97706', GLOW_COLORS.gold);

    const dimmed = resolveEnvelopeGlowFactors(0, envColors, sealColors);
    expect(dimmed.bodyEmissiveIntensity).toBe(0);
    expect(dimmed.sealStarEmissive).toBe(0);
    expect(dimmed.sealHaloOpacityBase).toBe(0);
    expect(dimmed.ambientBackdropAlpha).toBe(0);

    const standard = resolveEnvelopeGlowFactors(1, envColors, sealColors);
    expect(standard.bodyEmissiveIntensity).toBe(envColors.emissiveIntensity);
    expect(standard.sealStarEmissive).toBe(sealColors.starEmissiveIntensity);
    expect(standard.sealHaloOpacityBase).toBeGreaterThan(0.3);

    const boosted = resolveEnvelopeGlowFactors(1.5, envColors, sealColors);
    expect(boosted.bodyEmissiveIntensity).toBeGreaterThan(standard.bodyEmissiveIntensity);
    expect(boosted.sealHaloOpacityBase).toBeGreaterThan(standard.sealHaloOpacityBase);

    const warmCream = resolveEnvelopePaletteColors('#E8D8BF', COSMIC_PALETTES.lavender);
    const r = parseInt(warmCream.bodyHex.slice(1, 3), 16);
    const b = parseInt(warmCream.bodyHex.slice(5, 7), 16);
    expect(r).toBeGreaterThan(b + 15);

    const lightEnv = resolveEnvelopePaletteColors('#FFFFFF', COSMIC_PALETTES.lavender);
    const lightDimmed = resolveEnvelopeGlowFactors(0, lightEnv, sealColors);
    const lightStandard = resolveEnvelopeGlowFactors(1, lightEnv, sealColors);
    const lightBoosted = resolveEnvelopeGlowFactors(1.5, lightEnv, sealColors);
    expect(lightDimmed.bodyEmissiveIntensity).toBe(0);
    expect(lightDimmed.bodyClearcoat).toBe(0);
    expect(lightStandard.bodyClearcoat).toBe(0);
    expect(lightDimmed.albedoScale).toBeLessThan(lightStandard.albedoScale);
    expect(lightStandard.albedoScale).toBe(1);
    expect(lightBoosted.albedoScale).toBeGreaterThan(lightStandard.albedoScale);
    expect(lightStandard.ambientBackdropAlpha).toBe(0);
    expect(lightDimmed.bodyEnvMapIntensity).toBeLessThan(lightStandard.bodyEnvMapIntensity);
  });
});
