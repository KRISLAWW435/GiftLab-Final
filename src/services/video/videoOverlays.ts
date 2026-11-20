import {
  COSMIC_PALETTES,
  GLOW_COLORS,
  computeEnvelopeScreenGeometry,
  computeFinalLetterPresentation,
  computeStoryCardPresentation,
  resolveStarGlowHex,
  resolveStarImageSettings,
} from '../../scene/paletteConfig';
import type { ConstellationProject, ConstellationStar } from '../../types/project';
import {
  drawCardShell,
  drawFourPointProgressIcon,
  drawFourPointStarPath,
  drawRoundedRectPath,
  resolveCanvasTextShadow,
  wrapCanvasTextLines,
} from './videoCanvasPrimitives';
import {
  type DrawableImage,
  UI_SCALE,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  clamp,
  easeOutCubic,
  easeOutExpoish,
  lerp,
  rgba,
} from './videoTimeline';

export function drawSealedOverlay(
  ctx: CanvasRenderingContext2D,
  project: ConstellationProject,
  alpha: number,
): void {
  if (alpha <= 0.01) return;
  const envelopeGeom = computeEnvelopeScreenGeometry(
    project,
    VIDEO_WIDTH,
    VIDEO_HEIGHT,
    'phone',
    true,
  );
  const env = envelopeGeom.resolvedEnvelope;
  const translateYPx = envelopeGeom.textTranslateYPx;

  ctx.save();
  ctx.globalAlpha *= clamp(alpha, 0, 1);

  const headerY = 26 * UI_SCALE + translateYPx;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.font = `500 ${Math.round(13 * UI_SCALE)}px "Manrope", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
  ctx.shadowColor = 'rgba(4, 6, 20, 0.78)';
  ctx.shadowBlur = 8;
  ctx.fillText(env.kickerText, VIDEO_WIDTH / 2, headerY);

  const headFontPx = Math.round(24 * UI_SCALE);
  ctx.font = `800 ${headFontPx}px "Manrope", system-ui, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 16;
  const headLines = wrapCanvasTextLines(
    (s) => ctx.measureText(s).width,
    env.headlineText,
    VIDEO_WIDTH - 68,
  ).slice(0, 3);
  const lineStep = Math.round(headFontPx * 1.18);
  const headStartY = headerY + Math.round(22 * UI_SCALE);
  headLines.forEach((line, i) => {
    ctx.fillText(line, VIDEO_WIDTH / 2, headStartY + i * lineStep);
  });

  // Bottom hint & frosted pearl CTA button matching RecipientView
  const ctaH = Math.round(44 * UI_SCALE);
  const ctaW = Math.min(VIDEO_WIDTH - 76, Math.round(238 * UI_SCALE));
  const ctaY = VIDEO_HEIGHT - Math.round(32 * UI_SCALE) - ctaH;
  const ctaX = (VIDEO_WIDTH - ctaW) / 2;

  ctx.font = `500 ${Math.round(12.5 * UI_SCALE)}px "Manrope", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
  ctx.shadowBlur = 10;
  ctx.fillText(env.hintText, VIDEO_WIDTH / 2, ctaY - Math.round(24 * UI_SCALE));

  ctx.save();
  ctx.shadowColor = 'rgba(109, 84, 181, 0.56)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  drawRoundedRectPath(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  const btnGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX, ctaY + ctaH);
  btnGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  btnGrad.addColorStop(1, 'rgba(232, 226, 252, 0.94)');
  ctx.fillStyle = btnGrad;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#5B3FC4';
  drawFourPointStarPath(ctx, ctaX + Math.round(28 * UI_SCALE), ctaY + ctaH / 2, 7, 2.5);
  ctx.fill();

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#181236';
  ctx.font = `600 ${Math.round(14 * UI_SCALE)}px "Manrope", system-ui, sans-serif`;
  ctx.fillText(env.ctaText, VIDEO_WIDTH / 2 + 6, ctaY + ctaH / 2 + 0.5);
  ctx.restore();

  ctx.restore();
}

export function drawStoryOverlay(
  ctx: CanvasRenderingContext2D,
  project: ConstellationProject,
  star: ConstellationStar,
  starIndex: number,
  image: DrawableImage | undefined,
  localT: number,
  duration: number,
  globalTimeSec: number,
): void {
  const fadeIn = easeOutCubic(localT / 0.36);
  const fadeOut = 1 - clamp((localT - (duration - 0.28)) / 0.28, 0, 1);
  const alpha = fadeIn * fadeOut;
  if (alpha <= 0.01) return;

  const totalStars = project.stars.length;
  const globalGlow = GLOW_COLORS[project.globalGlowColor] ?? GLOW_COLORS.gold;

  const pres = computeStoryCardPresentation(project, star, {
    device: 'phone',
    viewportWidth: VIDEO_WIDTH,
    isPortrait: true,
    isCompactLandscape: false,
    editMode: false,
  });

  const {
    signatureText,
    activeStarGlow,
    cardTheme,
    cardColors,
    hasExplicitCardTheme,
    isMinimalistTheme,
    cardLayout,
    textStyle,
    fontMeta,
    effectiveAlign,
    effectiveBodyPx,
    effectiveTitlePx,
    titleLineHeight,
    textMarginLeftPct,
    illuLeftGrow,
    effectiveIlluPx,
    spacers: { topOuterGrow, topInnerGrow, bottomInnerGrow },
    storyCardOffsetY,
    storyCardScale,
    storyTextShiftY,
    starDecor,
    safeStarDecor,
    effectiveTextColor,
    effectiveShadowMode,
  } = pres;

  // Portrait readability scrim matching RecipientView (leaving upper sky open for 3D star)
  ctx.save();
  ctx.globalAlpha *= alpha;
  const scrim = ctx.createLinearGradient(0, VIDEO_HEIGHT, 0, 0);
  scrim.addColorStop(0, 'rgba(7, 11, 26, 0.90)');
  scrim.addColorStop(0.54, 'rgba(7, 11, 26, 0.44)');
  scrim.addColorStop(1, 'rgba(7, 11, 26, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // Top progress stars bar
  const barY = Math.round(28 * UI_SCALE);
  const dotStep = Math.min(24, 210 / Math.max(1, totalStars));
  const counterW = 46;
  const rowW = (totalStars - 1) * dotStep + counterW;
  const dotsStartX = VIDEO_WIDTH / 2 - rowW / 2 + 8;

  for (let i = 0; i < totalStars; i++) {
    const s = project.stars[i];
    const g = GLOW_COLORS[resolveStarGlowHex(s, project.globalGlowColor)] ?? globalGlow;
    drawFourPointProgressIcon(
      ctx,
      dotsStartX + i * dotStep,
      barY,
      6.5,
      g.hex,
      i <= starIndex,
      i === starIndex,
    );
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(12 * UI_SCALE)}px "Manrope", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
  ctx.fillText(
    `${starIndex + 1} / ${totalStars}`,
    dotsStartX + (totalStars - 1) * dotStep + 14,
    barY + 0.5,
  );

  // Story stage below upper ~30.5% 3D crystal star viewport
  const stageTop = Math.round(VIDEO_HEIGHT * 0.305);
  const stageBottom = VIDEO_HEIGHT - 22;
  const stageAvailH = stageBottom - stageTop;

  const targetW = cardLayout.customWidthPx
    ? clamp(Math.round(cardLayout.customWidthPx * UI_SCALE), 270, VIDEO_WIDTH - 24)
    : cardLayout.width === 'compact'
      ? 406
      : cardLayout.width === 'wide'
        ? 504
        : 462;
  const cardW = Math.min(VIDEO_WIDTH - 24, targetW);
  const cardOffsetY = Math.round(storyCardOffsetY * UI_SCALE);
  const slideY = (1 - fadeIn) * 20;

  const padH = isMinimalistTheme
    ? cardLayout.padding === 'compact'
      ? 34
      : cardLayout.padding === 'spacious'
        ? 46
        : 40
    : cardLayout.padding === 'compact'
      ? 22
      : cardLayout.padding === 'spacious'
        ? 34
        : 26;
  const padRight = cardLayout.padding === 'compact' ? 22 : cardLayout.padding === 'spacious' ? 34 : 26;
  const padV = cardLayout.padding === 'compact' ? 18 : cardLayout.padding === 'spacious' ? 28 : 22;

  const innerW = cardW - padH - padRight;
  const textBlockW = Math.max(120, Math.round(innerW * (textStyle.widthPct / 100)));
  const textBlockRelX = Math.round(innerW * (textMarginLeftPct / 100));

  const bodyPxBase = Math.round(effectiveBodyPx * UI_SCALE);
  const titlePx = Math.round(effectiveTitlePx * UI_SCALE);
  const titleLineH = Math.round(titlePx * titleLineHeight);

  const titleText = star.title.trim() || `Звезда ${starIndex + 1}`;
  const msgText = star.message.trim() || 'Здесь хранится особое тёплое пожелание.';

  ctx.font = `600 ${titlePx}px ${fontMeta.cssFamily}`;
  const titleLines = wrapCanvasTextLines((s) => ctx.measureText(s).width, titleText, textBlockW).slice(0, 3);

  let bodyPx = bodyPxBase;
  let msgLines: string[] = [];
  let bodyLineH = bodyPx * textStyle.lineHeight;
  let illuSize = Math.round(effectiveIlluPx * UI_SCALE);

  const maxCardH = Math.min(
    stageAvailH - 8,
    cardLayout.customHeightPx ? Math.round(cardLayout.customHeightPx * UI_SCALE) : stageAvailH - 8,
  );
  const measureTotalContent = (imgPx: number, bPx: number) => {
    ctx.font = `${textStyle.fontWeight === 'semibold' ? '600' : '400'} ${bPx}px ${fontMeta.cssFamily}`;
    const wrapW = textBlockW - (textStyle.accent === 'frame' ? 28 : textStyle.accent === 'quote' ? 18 : 4);
    const lines = wrapCanvasTextLines((s) => ctx.measureText(s).width, msgText, wrapW);
    const lh = bPx * textStyle.lineHeight;
    const ordH = Math.round(15 * UI_SCALE);
    const sigH = signatureText ? Math.round(22 * UI_SCALE) : 0;
    const textH = ordH + titleLines.length * titleLineH + 10 + lines.length * lh + sigH + (textStyle.accent === 'frame' ? 26 : 0);
    return { lines, lh, textH, totalH: imgPx + 18 + textH + padV * 2 };
  };

  let measured = measureTotalContent(illuSize, bodyPx);
  if (measured.totalH > maxCardH) {
    illuSize = Math.max(92, Math.round(illuSize * 0.8));
    measured = measureTotalContent(illuSize, bodyPx);
    while (measured.totalH > maxCardH && bodyPx > 14) {
      bodyPx -= 1;
      measured = measureTotalContent(illuSize, bodyPx);
    }
  }
  msgLines = measured.lines;
  bodyLineH = measured.lh;

  const minNeededH = Math.min(maxCardH, Math.max(300, measured.totalH + 22));
  const cardH = cardLayout.customHeightPx
    ? clamp(Math.round(cardLayout.customHeightPx * UI_SCALE), minNeededH, maxCardH)
    : minNeededH;

  const cardX = Math.round((VIDEO_WIDTH - cardW) / 2);
  const cardBaseY =
    cardLayout.verticalAlign === 'top'
      ? stageTop + 6
      : Math.round(stageTop + (stageAvailH - cardH) / 2);

  ctx.save();
  const cx = cardX + cardW / 2;
  const cy = cardBaseY + cardH / 2 + cardOffsetY + slideY;
  ctx.translate(cx, cy);
  ctx.scale(storyCardScale, storyCardScale);
  ctx.translate(-cx, -cy);

  if (hasExplicitCardTheme) {
    drawCardShell(
      ctx,
      cardTheme,
      cardColors,
      cardX,
      cardBaseY,
      cardW,
      cardH,
      activeStarGlow.hex,
      starDecor.motif,
      safeStarDecor.xPct,
      safeStarDecor.yPct,
      safeStarDecor.scale,
      safeStarDecor.opacity,
      globalTimeSec,
    );
  }

  // Unified flex spacer proportions from computeStoryCardPresentation
  const slackH = Math.max(0, cardH - padV * 2 - illuSize - measured.textH);
  const growSum = Math.max(0.01, topOuterGrow + topInnerGrow + bottomInnerGrow);
  const topOuterPx = slackH * (topOuterGrow / growSum);
  const topInnerPx = Math.max(10, slackH * (topInnerGrow / growSum));

  const innerX = cardX + padH;
  const illuX = Math.round(innerX + Math.max(0, innerW - illuSize) * illuLeftGrow);
  const illuY = Math.round(cardBaseY + padV + topOuterPx);

  const illuAura = ctx.createRadialGradient(
    illuX + illuSize / 2,
    illuY + illuSize / 2,
    4,
    illuX + illuSize / 2,
    illuY + illuSize / 2,
    illuSize * 0.72,
  );
  illuAura.addColorStop(0, rgba(activeStarGlow.hex, 0.24));
  illuAura.addColorStop(1, rgba(activeStarGlow.hex, 0));
  ctx.fillStyle = illuAura;
  ctx.beginPath();
  ctx.arc(illuX + illuSize / 2, illuY + illuSize / 2, illuSize * 0.72, 0, Math.PI * 2);
  ctx.fill();

  if (image) {
    const imgSettings = resolveStarImageSettings(star);
    const iw = image instanceof HTMLCanvasElement ? image.width : image.naturalWidth || image.width;
    const ih = image instanceof HTMLCanvasElement ? image.height : image.naturalHeight || image.height;
    if (iw > 0 && ih > 0) {
      ctx.save();
      drawRoundedRectPath(ctx, illuX, illuY, illuSize, illuSize, star.illustration.type === 'custom' ? 20 : 12);
      ctx.clip();

      if (star.illustration.type === 'custom') {
        ctx.fillStyle = cardColors.isLightPaper ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(illuX, illuY, illuSize, illuSize);
      }

      const fitScale =
        imgSettings.fit === 'cover'
          ? Math.max(illuSize / iw, illuSize / ih)
          : Math.min(illuSize / iw, illuSize / ih);
      const finalScale = fitScale * imgSettings.scale;
      const drawW = iw * finalScale;
      const drawH = ih * finalScale;
      const dx = illuX + (illuSize - drawW) / 2 + (imgSettings.offsetX / 100) * (illuSize * 0.5);
      const dy = illuY + (illuSize - drawH) / 2 + (imgSettings.offsetY / 100) * (illuSize * 0.5);
      ctx.drawImage(image, dx, dy, drawW, drawH);
      ctx.restore();

      if (star.illustration.type === 'custom') {
        ctx.save();
        drawRoundedRectPath(ctx, illuX, illuY, illuSize, illuSize, 20);
        ctx.strokeStyle = rgba(cardColors.accentColor, 0.45);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Message block anchored inside card
  const textX = innerX + textBlockRelX;
  const textY = Math.round(illuY + illuSize + topInnerPx + Math.round(storyTextShiftY * UI_SCALE));

  ctx.save();
  if (textStyle.accent === 'frame') {
    drawRoundedRectPath(ctx, textX, textY - 8, textBlockW, measured.textH + 4, 16);
    ctx.fillStyle = cardColors.isLightPaper ? 'rgba(255,255,255,0.62)' : 'rgba(7,11,26,0.62)';
    ctx.fill();
    ctx.strokeStyle = rgba(cardColors.isLightPaper ? cardColors.accentColor : activeStarGlow.hex, 0.35);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (textStyle.accent === 'quote') {
    ctx.fillStyle = cardColors.isLightPaper ? cardColors.accentColor : activeStarGlow.hex;
    const barX = effectiveAlign === 'right' ? textX + textBlockW - 3 : textX;
    ctx.fillRect(barX, textY + 2, 3, measured.textH - 10);
  }

  const innerTextPad = textStyle.accent === 'frame' ? 14 : textStyle.accent === 'quote' ? 14 : 0;
  const drawTextX =
    effectiveAlign === 'left'
      ? textX + innerTextPad
      : effectiveAlign === 'right'
        ? textX + textBlockW - innerTextPad
        : textX + textBlockW / 2;

  let curY = textY + (textStyle.accent === 'frame' ? 8 : 0);

  if (textStyle.accent === 'line') {
    const lineGrad = ctx.createLinearGradient(textX, curY, textX + 64, curY);
    lineGrad.addColorStop(0, cardColors.isLightPaper ? cardColors.accentColor : activeStarGlow.hex);
    lineGrad.addColorStop(1, cardColors.isLightPaper ? cardColors.badgeColor : activeStarGlow.coreHex);
    ctx.fillStyle = lineGrad;
    const lx =
      effectiveAlign === 'left'
        ? textX
        : effectiveAlign === 'right'
          ? textX + textBlockW - 64
          : textX + (textBlockW - 64) / 2;
    drawRoundedRectPath(ctx, lx, curY, 64, 2.5, 1.5);
    ctx.fill();
    curY += 10;
  }

  ctx.textAlign = effectiveAlign;
  ctx.textBaseline = 'top';
  ctx.fillStyle = cardColors.isLightPaper ? cardColors.badgeColor : activeStarGlow.coreHex;
  ctx.font = isMinimalistTheme
    ? `600 ${Math.round(10.5 * UI_SCALE)}px "Manrope", system-ui, sans-serif`
    : `500 ${Math.round(12 * UI_SCALE)}px ${fontMeta.cssFamily}`;
  const ordText = isMinimalistTheme
    ? `ЗВЕЗДА ${String(starIndex + 1).padStart(2, '0')} / ${String(totalStars).padStart(2, '0')}`
    : `Звезда ${starIndex + 1} из ${totalStars}`;
  ctx.fillText(ordText, drawTextX, curY);
  curY += Math.round(17 * UI_SCALE);

  ctx.fillStyle = effectiveTextColor;
  resolveCanvasTextShadow(ctx, effectiveShadowMode, effectiveTextColor, activeStarGlow.hex, cardColors.isLightPaper);
  ctx.font = `600 ${titlePx}px ${fontMeta.cssFamily}`;
  titleLines.forEach((line) => {
    ctx.fillText(line, drawTextX, curY);
    curY += titleLineH;
  });
  curY += 8;

  ctx.font = `${textStyle.fontWeight === 'semibold' ? '600' : '400'} ${bodyPx}px ${fontMeta.cssFamily}`;
  msgLines.forEach((line) => {
    ctx.fillText(line, drawTextX, curY);
    curY += bodyLineH;
  });

  if (signatureText) {
    curY += 6;
    ctx.save();
    ctx.globalAlpha *= 0.82;
    const sigPx = clamp(Math.round(bodyPx * 0.8), 14, 22);
    ctx.font = `italic 400 ${sigPx}px ${fontMeta.cssFamily}`;
    ctx.fillText(`— ${signatureText}`, drawTextX, curY);
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
  ctx.restore();
}

export function drawConstellationFinaleOverlay(
  ctx: CanvasRenderingContext2D,
  project: ConstellationProject,
  localT: number,
  duration: number,
  globalTimeSec: number,
): void {
  const palette = COSMIC_PALETTES[project.paletteId] ?? COSMIC_PALETTES.lavender;
  const globalGlow = GLOW_COLORS[project.globalGlowColor] ?? GLOW_COLORS.gold;

  const headerFade = easeOutCubic(localT / 0.55);
  const endFade = 1 - clamp((localT - (duration - 0.5)) / 0.5, 0, 1);

  ctx.save();
  ctx.globalAlpha *= headerFade * endFade;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.lineTint;
  ctx.font = `600 ${Math.round(10.5 * UI_SCALE)}px "Manrope", system-ui, sans-serif`;
  ctx.fillText('✦  СОЗВЕЗДИЕ  ✦', VIDEO_WIDTH / 2, Math.round(18 * UI_SCALE));

  const titleFontPx = Math.round(19 * UI_SCALE);
  ctx.font = `700 ${titleFontPx}px "Manrope", system-ui, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(4, 6, 20, 0.9)';
  ctx.shadowBlur = 16;
  const finaleTitle = project.title.trim() || 'Моё созвездие';
  const titleLines = wrapCanvasTextLines((s) => ctx.measureText(s).width, finaleTitle, VIDEO_WIDTH - 120).slice(0, 2);
  const titleTopY = Math.round(34 * UI_SCALE);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, VIDEO_WIDTH / 2, titleTopY + idx * Math.round(titleFontPx * 1.18));
  });

  const lineY = titleTopY + titleLines.length * Math.round(titleFontPx * 1.18) + 7;
  const divGrad = ctx.createLinearGradient(VIDEO_WIDTH / 2 - 64, lineY, VIDEO_WIDTH / 2 + 64, lineY);
  divGrad.addColorStop(0, 'rgba(255,255,255,0)');
  divGrad.addColorStop(0.5, globalGlow.hex);
  divGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(VIDEO_WIDTH / 2 - 64, lineY);
  ctx.lineTo(VIDEO_WIDTH / 2 + 64, lineY);
  ctx.stroke();
  ctx.restore();

  const letterDelay = 1.15;
  if (localT <= letterDelay) return;

  const appear = easeOutExpoish((localT - letterDelay) / 0.72);
  if (appear <= 0.01) return;

  const pres = computeFinalLetterPresentation(project, {
    device: 'phone',
    isPortrait: true,
    isCompactLandscape: false,
    editMode: false,
  });

  const {
    cardTheme,
    cardColors,
    isMinimalist,
    resolvedText: finalStyle,
    fontMeta,
    effectiveAlign,
    effectiveTextColor,
    effectiveShadow,
    finalDecor,
    safeDecor,
    cardLayout,
    bodyPx: presBodyPx,
    headerPx: presHeaderPx,
    signaturePx: presSignaturePx,
    cardShiftY: presCardShiftY,
    textMarginLeftPct,
    textShiftY: presTextShiftY,
  } = pres;

  const cardW = cardLayout.customWidthPx
    ? clamp(Math.round(cardLayout.customWidthPx * UI_SCALE), 270, VIDEO_WIDTH - 24)
    : cardLayout.width === 'compact'
      ? 406
      : cardLayout.width === 'wide'
        ? 500
        : 462;

  const bodyPxBase = clamp(
    Math.round(presBodyPx * UI_SCALE),
    14,
    Math.round(24 * UI_SCALE),
  );
  const headerPx = clamp(Math.round(presHeaderPx * UI_SCALE), 14, Math.round(15 * UI_SCALE));
  const signaturePx = clamp(Math.round(presSignaturePx * UI_SCALE), 16, Math.round(24 * UI_SCALE));

  const padH = isMinimalist ? 34 : cardLayout.padding === 'compact' ? 22 : cardLayout.padding === 'spacious' ? 32 : 26;
  const innerW = cardW - padH * 2;
  const textBlockW = Math.max(120, Math.round(innerW * (finalStyle.widthPct / 100)));
  const textBlockRelX = Math.round(innerW * (textMarginLeftPct / 100));

  const finalMsgText = project.finalMessage.trim() || 'С любовью и тёплыми пожеланиями.';
  let bodyPx = bodyPxBase;
  let msgLines: string[] = [];
  let lineH = bodyPx * finalStyle.lineHeight;
  const maxBodyH = 440;

  while (bodyPx >= 14) {
    ctx.font = `${finalStyle.fontWeight === 'semibold' ? '600' : '400'} ${bodyPx}px ${fontMeta.cssFamily}`;
    const wrapW = textBlockW - (finalStyle.accent === 'frame' ? 28 : finalStyle.accent === 'quote' ? 18 : 4);
    msgLines = wrapCanvasTextLines((s) => ctx.measureText(s).width, finalMsgText, wrapW);
    lineH = bodyPx * finalStyle.lineHeight;
    if (msgLines.length * lineH <= maxBodyH) break;
    bodyPx -= 1;
  }

  const signatureText =
    project.senderName?.trim() || (project.recipientName ? `Для ${project.recipientName}` : '');
  const headerBlockH = Math.round(44 * UI_SCALE);
  const footerBlockH = signatureText ? Math.round(42 * UI_SCALE) : 16;
  const bodyPadV = cardLayout.padding === 'compact' ? 26 : cardLayout.padding === 'spacious' ? 40 : 34;
  const bodyBlockH = Math.round(msgLines.length * lineH + bodyPadV + (finalStyle.accent === 'frame' ? 24 : 0));

  const computedCardH = clamp(headerBlockH + bodyBlockH + footerBlockH, 240, 680);
  const cardH = cardLayout.customHeightPx
    ? clamp(Math.round(cardLayout.customHeightPx * UI_SCALE), computedCardH, 700)
    : computedCardH;

  const cardX = Math.round((VIDEO_WIDTH - cardW) / 2);
  const baseTop =
    cardLayout.verticalAlign === 'top'
      ? lineY + 24
      : Math.max(lineY + 22, Math.round((VIDEO_HEIGHT - cardH) * 0.56));
  const cardShiftY = Math.round(presCardShiftY * UI_SCALE);
  const animY = (1 - appear) * 145;
  const cardScale = pres.cardScale * lerp(0.86, 1.0, appear);

  ctx.save();
  ctx.globalAlpha *= appear * endFade;
  const cx = cardX + cardW / 2;
  const cy = baseTop + cardH / 2 + cardShiftY + animY;
  ctx.translate(cx, cy);
  ctx.scale(cardScale, cardScale);
  ctx.translate(-cx, -cy);

  drawCardShell(
    ctx,
    cardTheme,
    cardColors,
    cardX,
    baseTop,
    cardW,
    cardH,
    globalGlow.hex,
    finalDecor.motif,
    safeDecor.xPct,
    safeDecor.yPct,
    safeDecor.scale,
    safeDecor.opacity,
    globalTimeSec,
  );

  const headX = cardX + padH;
  const headY = baseTop + Math.round(16 * UI_SCALE);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = cardColors.accentColor;
  if (isMinimalist) {
    ctx.save();
    ctx.translate(headX + 6, headY + 12);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = cardColors.accentColor;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-4, -4, 8, 8);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(headX + 12, headY + 12, 12, 0, Math.PI * 2);
    ctx.fillStyle = rgba(cardColors.accentColor, 0.14);
    ctx.fill();
    ctx.strokeStyle = rgba(cardColors.accentColor, 0.48);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = cardColors.accentColor;
    drawFourPointStarPath(ctx, headX + 12, headY + 12, 6, 2);
    ctx.fill();
  }

  ctx.fillStyle = cardColors.badgeColor;
  ctx.font = `600 ${headerPx}px "Manrope", system-ui, sans-serif`;
  const recLabel = project.recipientName.trim() ? `Для ${project.recipientName.trim()}` : 'Поздравление';
  const headerLabel = `${recLabel} · ${finaleTitle}`;
  ctx.fillText(headerLabel, headX + 32, headY + 12, innerW - 36);

  const divY = baseTop + headerBlockH;
  const hGrad = ctx.createLinearGradient(cardX + padH, divY, cardX + cardW - padH, divY);
  hGrad.addColorStop(0, 'rgba(0,0,0,0)');
  hGrad.addColorStop(0.5, rgba(cardColors.accentColor, 0.36));
  hGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.strokeStyle = hGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + padH, divY);
  ctx.lineTo(cardX + cardW - padH, divY);
  ctx.stroke();

  const textShiftY = Math.round(presTextShiftY * UI_SCALE);
  const textX = cardX + padH + textBlockRelX;
  const textY = divY + Math.round(bodyPadV * 0.5) + textShiftY;

  ctx.save();
  if (finalStyle.accent === 'frame') {
    drawRoundedRectPath(ctx, textX, textY - 8, textBlockW, msgLines.length * lineH + 22, 16);
    ctx.fillStyle = cardColors.isLightPaper ? 'rgba(255,255,255,0.58)' : 'rgba(6,8,20,0.52)';
    ctx.fill();
    ctx.strokeStyle = rgba(cardColors.accentColor, 0.35);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (finalStyle.accent === 'quote') {
    ctx.fillStyle = cardColors.accentColor;
    const barX = effectiveAlign === 'right' ? textX + textBlockW - 3 : textX;
    ctx.fillRect(barX, textY, 3, msgLines.length * lineH);
  }

  let curY = textY + (finalStyle.accent === 'frame' ? 4 : 0);
  if (finalStyle.accent === 'line') {
    ctx.fillStyle = cardColors.accentColor;
    const lx =
      effectiveAlign === 'left'
        ? textX
        : effectiveAlign === 'right'
          ? textX + textBlockW - 64
          : textX + (textBlockW - 64) / 2;
    drawRoundedRectPath(ctx, lx, curY - 8, 64, 2.5, 1.5);
    ctx.fill();
  }

  const innerTextPad = finalStyle.accent === 'frame' ? 14 : finalStyle.accent === 'quote' ? 14 : 0;
  const drawTextX =
    effectiveAlign === 'left'
      ? textX + innerTextPad
      : effectiveAlign === 'right'
        ? textX + textBlockW - innerTextPad
        : textX + textBlockW / 2;

  ctx.textAlign = effectiveAlign;
  ctx.textBaseline = 'top';
  ctx.fillStyle = effectiveTextColor;
  resolveCanvasTextShadow(ctx, effectiveShadow, effectiveTextColor, globalGlow.hex, cardColors.isLightPaper);
  ctx.font = `${finalStyle.fontWeight === 'semibold' ? '600' : '400'} ${bodyPx}px ${fontMeta.cssFamily}`;
  msgLines.forEach((line) => {
    ctx.fillText(line, drawTextX, curY);
    curY += lineH;
  });
  ctx.restore();

  if (signatureText) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = cardColors.badgeColor;
    ctx.font = `italic 600 ${signaturePx}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillText(`— ${signatureText}`, cardX + cardW - padH, baseTop + cardH - Math.round(14 * UI_SCALE));
  }

  ctx.restore();
}
