import JSZip from 'jszip';
import { renderBuiltinIllustrationToBlob } from '../assets/illustrations';
import {
  resolveCardTheme,
  resolveStarShape,
  resolveStarTextStyle,
  sanitizeConnections,
} from '../scene/paletteConfig';
import type { BuiltinIllustrationId, ConstellationProject } from '../types/project';
import { getImageBlob } from './database';
import { bundleFontsForZip } from './localFonts';
import { resolveProjectMusicForExport } from './musicEngine';
import runtimeBundle from '../standalone/runtime.bundle.txt?raw';

function escapeHtmlText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonForScriptTag(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '_');
  return cleaned || 'Моё_созвездие';
}

const STANDALONE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #app { width: 100%; height: 100%; overflow: hidden; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #f8fafc; background: #090d1f; }
  .gl-stage { position: relative; width: 100%; height: 100dvh; overflow: hidden; }
  .gl-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }

  /* Sealed & Birthing & FinalReveal Chrome */
  .gl-sealed-ui { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; justify-content: space-between; padding: 28px 20px; pointer-events: none; }
  .gl-sealed-head { text-align: center; max-width: 680px; margin: 0 auto; position: relative; z-index: 2; }
  .gl-sealed-foot { pointer-events: auto; display: flex; flex-direction: column; align-items: center; gap: 12px; padding-bottom: 16px; position: relative; z-index: 2; }
  .gl-sealed-sub { font-size: 13px; color: #cbd5e1; text-align: center; }
  .gl-open-btn { padding: 14px 30px !important; font-size: 16px !important; border-radius: 9999px !important; }
  .gl-open-btn-pearl { background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(232,226,252,0.94) 100%) !important; color: #181236 !important; border: 1px solid rgba(255,255,255,0.8) !important; box-shadow: 0 14px 36px rgba(109, 84, 181, 0.52), 0 0 28px rgba(255, 255, 255, 0.32) !important; }
  .gl-open-btn-pearl:hover { transform: scale(1.03); filter: brightness(1.02); }

  .gl-birth-ui { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding: 18px; pointer-events: none; }
  .gl-birth-actions { pointer-events: auto; display: flex; align-items: center; gap: 8px; }
  .gl-audio-banner { pointer-events: auto; margin: 0 auto 14px; display: flex; align-items: center; gap: 12px; padding: 9px 14px; border-radius: 16px; background: rgba(255,255,255,0.06); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); border: 1px solid rgba(252,211,77,0.42); box-shadow: inset 0 0 20px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.4); font-size: 12px; color: #fef3c7; }

  .gl-2d-sealed { position: fixed; inset: 0; z-index: 12; display: flex; align-items: center; justify-content: center; }
  .gl-2d-sealed-glow { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
  .gl-2d-envelope { position: relative; z-index: 2; width: 300px; height: 186px; border-radius: 26px; border: 1px solid rgba(255,255,255,0.65); overflow: hidden; background: linear-gradient(155deg, rgba(255,255,255,0.28) 0%, rgba(235,232,255,0.16) 52%, rgba(255,255,255,0.08) 100%); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); box-shadow: 0 26px 64px rgba(10,8,28,0.65), inset 0 1px 1px rgba(255,255,255,0.85), inset 0 -10px 24px rgba(139,92,246,0.16); display: flex; align-items: center; justify-content: center; }
  .gl-2d-envelope-flap { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .gl-2d-seal { position: relative; z-index: 3; margin-top: 20px; width: 56px; height: 56px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.75); }
  .gl-2d-sealed-lbl { font-size: 12px; color: #cbd5e1; }

  /* Swipeable Borderless Star Story Experience */
  .gl-story-ui { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; pointer-events: none; overflow-x: hidden; }
  .gl-story-scrim { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to left, rgba(6,9,24,0.78), rgba(6,9,24,0.36) 48%, transparent); }
  .gl-story-top { position: relative; z-index: 30; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 24px 6px; flex-shrink: 0; }
  .gl-story-brand { font-size: 13px; color: rgba(203,213,225,0.9); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
  .gl-story-progress { pointer-events: auto; display: flex; align-items: center; gap: 8px; }
  .gl-dots { display: flex; align-items: center; gap: 4px; }
  .gl-star-dot { width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: none; padding: 0; cursor: pointer; transition: transform 180ms ease, opacity 180ms ease; }
  .gl-star-dot:hover:not(:disabled) { transform: scale(1.15); }
  .gl-star-dot:disabled { cursor: default; opacity: 0.25; }
  .gl-star-dot-active { transform: scale(1.18); }
  .gl-progress-txt { font-size: 12px; font-weight: 600; color: #e2e8f0; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .gl-story-utils { pointer-events: auto; display: flex; align-items: center; gap: 6px; }

  .gl-story-grid { position: relative; z-index: 10; flex: 1; min-height: 0; overflow: hidden; display: grid; grid-template-columns: 44% 56%; transition: opacity 280ms ease; }
  .gl-story-grid.gl-story-dimmed { opacity: 0.1; pointer-events: none; }
  .gl-story-left { min-height: 0; pointer-events: none; }
  .gl-story-right { position: relative; pointer-events: auto; min-height: 0; overflow-y: auto; overflow-x: hidden; touch-action: pan-y; display: flex; flex-direction: column; justify-content: space-between; padding: 12px 48px 22px 16px; }
  .gl-card-decor { position: absolute; z-index: 0; pointer-events: none; opacity: 0.78; }
  .gl-card-decor-svg { width: 104px; height: 104px; display: block; }
  @keyframes glStoryIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .gl-story-motion-wrap { position: relative; z-index: 10; margin: auto 0; max-height: 100%; width: 100%; max-width: 560px; display: flex; flex-direction: column; transition: transform 220ms ease-out; }
  .gl-story-paper { position: relative; overflow: hidden; border-radius: 26px; border: 1px solid rgba(255,255,255,0.2); padding: 16px 22px; backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); box-shadow: inset 0 1px 0 rgba(244,114,182,0.22), inset 0 0 20px rgba(255,255,255,0.08), 0 20px 40px rgba(0,0,0,0.4); }
  .gl-story-paper.gl-paper-light { backdrop-filter: none; -webkit-backdrop-filter: none; box-shadow: 0 20px 50px rgba(4,7,20,0.45); }
  .gl-story-content { position: relative; z-index: 2; flex: 1; min-height: 0; width: 100%; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; align-items: stretch; }
  .gl-story-spacer { flex-basis: 0; flex-shrink: 0; }
  .gl-story-block { flex-shrink: 0; max-width: 100%; display: flex; flex-direction: column; gap: 8px; }
  .gl-story-block-frame { border: 1px solid rgba(255,255,255,0.24); border-radius: 16px; background: rgba(7,11,26,0.56); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); padding: 14px 18px; box-shadow: inset 0 0 18px rgba(255,255,255,0.08), 0 20px 40px rgba(0,0,0,0.4); }
  .gl-story-block-frame-light { background: rgba(255,255,255,0.65); box-shadow: 0 10px 28px rgba(4,7,20,0.08); }
  .gl-story-block-quote-left { border-left: 2px solid #c4b5fd; padding: 2px 0 2px 14px; }
  .gl-story-block-quote-right { border-right: 2px solid #c4b5fd; padding: 2px 14px 2px 0; }
  .gl-story-accent-line { height: 2px; width: 64px; border-radius: 999px; margin-bottom: 2px; }
  .gl-story-anim .gl-story-content { animation: glStoryIn 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .gl-reduced .gl-story-anim .gl-story-content { animation: none; }

  .gl-illu-row { width: 100%; display: flex; align-items: center; flex-shrink: 0; }
  .gl-illu-wrap { position: relative; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 4px 0; }
  .gl-illu-glow { position: absolute; inset: -20px; border-radius: 999px; pointer-events: none; opacity: 0.58; }
  .gl-illu-frame { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; border-radius: 12px; max-width: 100%; filter: drop-shadow(0 14px 30px rgba(0,0,0,0.45)); }
  .gl-illu-img { width: 100%; height: 100%; object-fit: contain; display: block; }

  .gl-story-ord { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
  .gl-story-title { font-size: clamp(22px, 3vw, 36px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.18; color: #ffffff; text-shadow: 0 0 20px rgba(255,255,255,0.2), 0 2px 14px rgba(0,0,0,0.65); user-select: text; overflow-wrap: anywhere; word-break: break-word; }
  .gl-story-msg { font-size: clamp(15px, 1.4vw, 19px); line-height: 1.6; color: rgba(241,245,249,0.95); white-space: pre-wrap; text-shadow: 0 2px 10px rgba(0,0,0,0.75); user-select: text; overflow-wrap: anywhere; word-break: break-word; }
  .gl-story-sign { font-size: 13px; font-style: italic; color: rgba(203,213,225,0.9); user-select: text; }

  /* Compact Secondary Arrows & Unobtrusive Swipe Hint */
  .gl-story-nav { width: 100%; max-width: 560px; padding-top: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .gl-nav-arrow { width: 38px; height: 38px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.24); background: rgba(255,255,255,0.06); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.28), inset 0 0 14px rgba(255,255,255,0.08), 0 12px 26px rgba(0,0,0,0.4); color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 150ms ease, transform 150ms ease, opacity 150ms ease; flex-shrink: 0; }
  .gl-nav-arrow:hover:not(:disabled) { background: rgba(255,255,255,0.14); }
  .gl-nav-arrow:active:not(:disabled) { transform: scale(0.94); }
  .gl-nav-arrow:disabled { opacity: 0.25; cursor: default; }
  .gl-nav-arrow-finale { border-color: rgba(252,211,77,0.48); background: rgba(245,158,11,0.22); color: #fef3c7; }
  .gl-swipe-hint { display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 13px; color: rgba(203,213,225,0.92); text-align: center; user-select: none; }
  .gl-swipe-hint-finale { color: rgba(254,243,199,0.95); font-weight: 500; }
  @keyframes glNudgeLeft { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-6px); } }
  .gl-swipe-arrow { display: inline-flex; color: #c4b5fd; animation: glNudgeLeft 2.1s ease-in-out infinite; }
  .gl-swipe-hint-finale .gl-swipe-arrow { color: #fcd34d; }
  .gl-reduced .gl-swipe-arrow { animation: none; }

  /* Finale Emerging Paper Letter & Bottom Dock */
  @keyframes glLetterEmerge {
    from { opacity: 0; transform: translateY(130px) scale(0.88); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .gl-letter-backdrop { position: fixed; inset: 0; z-index: 25; display: flex; align-items: center; justify-content: center; padding: 48px 16px 14px; pointer-events: none; }
  .gl-letter-card { pointer-events: auto; position: relative; width: 100%; max-width: min(92vw, 540px); border-radius: 26px; border: 1px solid rgba(255,255,255,0.2); overflow: hidden; display: flex; flex-direction: column; animation: glLetterEmerge 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .gl-reduced .gl-letter-card { animation: none; }
  .gl-letter-pattern { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
  .gl-letter-frame-inner { position: absolute; inset: 10px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.18); pointer-events: none; z-index: 0; }
  .gl-aurora-orbit-wrap { position: absolute; left: 50%; top: 50%; width: 86%; max-width: 440px; aspect-ratio: 1 / 1; pointer-events: none; z-index: 0; transform: translate3d(-50%, -50%, 0); will-change: transform; }
  .gl-aurora-orbit-cw { animation: glOrbitSpin 54s linear infinite; opacity: 0.55; }
  .gl-aurora-orbit-ccw { width: 70%; max-width: 350px; animation: glOrbitSpinRev 72s linear infinite; opacity: 0.45; }
  @keyframes glOrbitSpin { from { transform: translate3d(-50%, -50%, 0) rotate(0deg); } to { transform: translate3d(-50%, -50%, 0) rotate(360deg); } }
  @keyframes glOrbitSpinRev { from { transform: translate3d(-50%, -50%, 0) rotate(360deg); } to { transform: translate3d(-50%, -50%, 0) rotate(0deg); } }
  .gl-reduced .gl-aurora-orbit-cw, .gl-reduced .gl-aurora-orbit-ccw { animation: none; }
  @keyframes glStarburstPulse {
    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.88; }
    50% { transform: scale(1.06) rotate(4deg); opacity: 1; }
  }
  .gl-starburst-wrap { position: absolute; pointer-events: none; z-index: 0; }
  .gl-starburst-stars { right: 16px; top: 24px; width: 128px; height: 128px; opacity: 0.9; }
  .gl-starburst-aurora { right: 14px; top: 18px; width: 112px; height: 112px; opacity: 0.9; }
  .gl-starburst-pulse { animation: glStarburstPulse 6.5s ease-in-out infinite; will-change: transform, opacity; }
  .gl-reduced .gl-starburst-pulse { animation: none; }
  @media (prefers-reduced-motion: reduce) {
    .gl-aurora-orbit-cw, .gl-aurora-orbit-ccw { animation: none !important; }
    .gl-starburst-pulse { animation: none !important; }
  }
  .gl-card-top-rim { position: absolute; left: 16px; right: 16px; top: 0; height: 1px; pointer-events: none; z-index: 1; opacity: 0.85; }
  .gl-card-holo-rim { box-shadow: inset 0 1px 1px rgba(255,255,255,0.62), inset 0 -1px 1px rgba(196,181,253,0.34), inset 0 0 28px rgba(255,255,255,0.14); }
  .gl-hatched-divider { position: relative; z-index: 2; height: 12px; margin: 0 22px; border-radius: 4px; background-image: repeating-linear-gradient(-45deg, rgba(255,255,255,0.13) 0px, rgba(255,255,255,0.13) 2px, transparent 2px, transparent 7px); border-top: 1px solid rgba(255,255,255,0.12); border-bottom: 1px solid rgba(255,255,255,0.08); opacity: 1; flex-shrink: 0; }
  .gl-hatched-divider-light { position: relative; z-index: 2; height: 12px; margin: 0 22px; border-radius: 4px; background-image: repeating-linear-gradient(-45deg, rgba(15,23,42,0.10) 0px, rgba(15,23,42,0.10) 2px, transparent 2px, transparent 7px); border-top: 1px solid rgba(15,23,42,0.12); opacity: 1; flex-shrink: 0; }
  .gl-diamond-band { position: relative; z-index: 2; height: 16px; margin: 0 22px; border-top: 1px solid rgba(255,255,255,0.28); border-bottom: 1px solid rgba(255,255,255,0.22); background-image: linear-gradient(135deg, rgba(255,255,255,0.14) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,0.14) 25%, transparent 25%), linear-gradient(45deg, rgba(255,255,255,0.12) 25%, transparent 25%), linear-gradient(315deg, rgba(255,255,255,0.12) 25%, transparent 25%); background-position: 8px 0, 8px 0, 0 0, 0 0; background-size: 16px 16px; opacity: 1; flex-shrink: 0; }
  .gl-minimal-kicker { font-size: 11px !important; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; }
  .gl-letter-head { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 22px 8px; flex-shrink: 0; }
  .gl-letter-kicker { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; letter-spacing: 0.01em; line-height: 1.3; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
  .gl-letter-close { width: 32px; height: 32px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); font-size: 18px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .gl-constellation-title-wrap { pointer-events: none; position: fixed; inset: 0 0 auto 0; z-index: 20; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 16px 64px 0; }
  .gl-constellation-eyebrow { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.22em; opacity: 0.82; }
  .gl-constellation-title { margin-top: 2px; font-size: clamp(17px, 2.8vw, 24px); font-weight: 700; letter-spacing: -0.015em; line-height: 1.28; color: #ffffff; max-width: min(80vw, 540px); white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
  .gl-constellation-rule { margin-top: 6px; height: 1px; width: 96px; opacity: 0.75; }
  .gl-icon-btn { pointer-events: auto; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.24); background: rgba(11,8,22,0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); color: #f8fafc; box-shadow: 0 8px 20px rgba(0,0,0,0.38); cursor: pointer; transition: background 150ms ease, border-color 150ms ease, transform 150ms ease; flex-shrink: 0; }
  .gl-icon-btn:hover { background: rgba(11,8,22,0.82); border-color: rgba(255,255,255,0.44); }
  .gl-icon-btn:active { transform: scale(0.95); }
  .gl-icon-btn-active { background: rgba(245,158,11,0.25); border-color: rgba(252,211,77,0.6); color: #fef3c7; }
  .gl-icon-btn-active:hover { background: rgba(245,158,11,0.35); border-color: rgba(252,211,77,0.78); }
  .gl-letter-fab { position: fixed; top: 16px; right: 16px; z-index: 30; }
  @media (min-width: 640px) { .gl-constellation-title-wrap { padding: 20px 96px 0; } .gl-icon-btn { width: 40px; height: 40px; } .gl-letter-fab { top: 20px; right: 24px; } }
  .gl-letter-divider { position: relative; z-index: 2; height: 1px; margin: 0 22px; opacity: 0.4; flex-shrink: 0; }
  .gl-letter-body { position: relative; z-index: 2; overflow-y: auto; overscroll-behavior: contain; padding: 18px 26px; max-height: 54dvh; }
  .gl-letter-inner { display: flex; flex-direction: column; gap: 12px; }
  .gl-letter-msg { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; user-select: text; }
  .gl-letter-sign { font-size: 14px; font-style: italic; opacity: 0.82; user-select: text; }
  .gl-letter-foot { position: relative; z-index: 2; padding: 6px 22px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; flex-shrink: 0; }
  .gl-letter-hide-link { background: transparent; border: none; font: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; padding: 4px 0; }

  .gl-kicker { font-size: 13px; color: #cbd5e1; margin-bottom: 4px; letter-spacing: 0.01em; }
  .gl-title { font-size: clamp(22px, 3.2vw, 34px); font-weight: 800; letter-spacing: -0.025em; line-height: 1.18; color: #ffffff; text-shadow: 0 0 20px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.6); }
  .gl-dock { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; padding: 8px 12px; border-radius: 18px; background: rgba(16, 20, 44, 0.56); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); border: 1px solid rgba(255,255,255,0.22); box-shadow: inset 0 1px 0 rgba(244,114,182,0.22), inset 0 0 20px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.4); z-index: 30; max-width: 95vw; }
  .gl-star-pills { display: flex; align-items: center; gap: 4px; padding-right: 8px; border-right: 1px solid rgba(255,255,255,0.16); }
  .gl-star-pill { width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #ffffff; font-size: 12px; font-weight: 600; cursor: pointer; font-variant-numeric: tabular-nums; box-shadow: inset 0 1px 0 rgba(255,255,255,0.15); }
  .gl-star-pill:hover { background: rgba(255,255,255,0.18); }

  .gl-btn { border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.06); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 20px rgba(0,0,0,0.34); color: #f8fafc; padding: 8px 15px; border-radius: 9999px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 150ms ease, transform 150ms ease, box-shadow 150ms ease; }
  .gl-btn:hover { background: rgba(255,255,255,0.14); }
  .gl-btn:active { transform: scale(0.98); }
  .gl-btn-primary { background: linear-gradient(135deg, #ec4899 0%, #9333ea 48%, #6366f1 82%, #38bdf8 100%); border-color: rgba(255,255,255,0.34); color: #ffffff; box-shadow: 0 10px 26px rgba(236,72,153,0.3), 0 8px 20px rgba(99,102,241,0.36), inset 0 1px 0 rgba(255,255,255,0.45); }
  .gl-btn-primary:hover { filter: brightness(1.08); }
  .gl-btn-accent { background: rgba(124, 58, 237, 0.32); border-color: rgba(167, 139, 250, 0.6); }
  .gl-btn-ghost { background: rgba(255, 255, 255, 0.05); border-color: rgba(255,255,255,0.18); }
  .gl-btn-amber { background: rgba(245, 158, 11, 0.22); border-color: rgba(252, 211, 77, 0.4); color: #fef3c7; }
  .gl-vol { width: 78px; accent-color: #a78bfa; cursor: pointer; }
  .gl-hidden { display: none !important; }

  .gl-2d-lines { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .gl-2d-star { position: absolute; transform: translate(-50%, -50%); background: transparent; border: none; color: #fff; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px; transition: left 450ms ease, top 450ms ease, opacity 300ms ease; }
  .gl-2d-label { font-size: 12px; font-weight: 600; text-shadow: 0 1px 6px rgba(0,0,0,0.85); white-space: nowrap; }

  /* Portrait orientation (priority for phones & vertical tablets) */
  @media (orientation: portrait), (max-width: 539px) {
    .gl-story-scrim { background: linear-gradient(to top, rgba(6,9,24,0.9), rgba(6,9,24,0.44) 56%, transparent); }
    .gl-story-top { padding: 12px 14px 4px; }
    .gl-story-brand { display: none; }
    .gl-story-grid { display: flex; flex-direction: column; }
    .gl-story-left { height: 32vh; min-height: 185px; max-height: 290px; flex-shrink: 0; }
    .gl-story-right { flex: 1; padding: 14px 16px 16px; align-items: center; }
    .gl-story-paper { padding: 12px 16px; }
    .gl-card-decor-svg { width: 80px; height: 80px; }
    .gl-story-motion-wrap { margin: 0 auto; }
    .gl-story-nav { margin: 0 auto; }
    .gl-letter-backdrop { padding: 44px 12px 12px; }
    .gl-letter-body { padding: 14px 18px; max-height: 50dvh; }
  }

  /* Compact landscape phones (e.g. 667x375, 844x390) */
  @media (orientation: landscape) and (max-height: 520px) {
    .gl-story-top { padding: 8px 16px 4px; }
    .gl-story-brand { display: none; }
    .gl-story-right { padding: 4px 20px 10px 10px; }
    .gl-story-title { font-size: 20px; }
    .gl-story-msg { font-size: 14px; line-height: 1.45; }
    .gl-story-nav { padding-top: 6px; }
    .gl-letter-backdrop { padding: 16px 16px 10px; }
    .gl-letter-body { padding: 12px 20px; max-height: 44dvh; }
  }
`;

export async function exportProjectToZip(
  project: ConstellationProject,
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();
  const assetsFolder = zip.folder('assets')!;
  const imagesFolder = assetsFolder.folder('images')!;

  const builtinCache = new Map<string, string>();
  const standaloneStars = [];

  for (let i = 0; i < project.stars.length; i++) {
    const star = project.stars[i];
    const padNum = String(i + 1).padStart(2, '0');
    let assetImagePath = '';

    if (star.illustration.type === 'builtin') {
      const builtinId = star.illustration.id as BuiltinIllustrationId;
      const existingPath = builtinCache.get(builtinId);
      if (existingPath) {
        assetImagePath = existingPath;
      } else {
        const { blob, ext } = await renderBuiltinIllustrationToBlob(builtinId, 640);
        const fileName = `builtin-${builtinId}.${ext}`;
        imagesFolder.file(fileName, blob);
        assetImagePath = `assets/images/${fileName}`;
        builtinCache.set(builtinId, assetImagePath);
      }
    } else {
      const customBlob = await getImageBlob(star.illustration.id);
      if (customBlob) {
        const ext = customBlob.type === 'image/png' ? 'png' : 'webp';
        const fileName = `star-${padNum}.${ext}`;
        imagesFolder.file(fileName, customBlob);
        assetImagePath = `assets/images/${fileName}`;
      } else {
        const { blob, ext } = await renderBuiltinIllustrationToBlob('heart', 640);
        const fileName = `builtin-heart.${ext}`;
        if (!builtinCache.has('heart')) {
          imagesFolder.file(fileName, blob);
          builtinCache.set('heart', `assets/images/${fileName}`);
        }
        assetImagePath = builtinCache.get('heart')!;
      }
    }

    standaloneStars.push({
      ...star,
      shape: resolveStarShape(star),
      assetImagePath,
    });
  }

  let musicPath: string | null = null;
  let musicName: string | null = null;
  const resolvedMusic = await resolveProjectMusicForExport(project);
  if (resolvedMusic) {
    const musicFolder = assetsFolder.folder('music')!;
    musicFolder.file(resolvedMusic.fileName, resolvedMusic.blob);
    musicPath = `assets/music/${resolvedMusic.fileName}`;
    musicName = resolvedMusic.name;
  }

  const usedFontIds = new Set(
    project.stars.map((s) => resolveStarTextStyle(s).fontId),
  );
  if (project.finalTextStyle) {
    usedFontIds.add(resolveStarTextStyle(project.finalTextStyle).fontId);
  }
  const activeCardTheme = resolveCardTheme(project.cardTheme);
  usedFontIds.add(activeCardTheme.defaultFontId);
  if (activeCardTheme.id === 'minimalist') {
    usedFontIds.add('manrope');
  }
  const fontFaceCss = await bundleFontsForZip(assetsFolder, usedFontIds);

  const payload = {
    title: project.title,
    recipientName: project.recipientName,
    senderName: project.senderName ?? '',
    occasionLabel: project.occasionLabel,
    paletteId: project.paletteId,
    globalGlowColor: project.globalGlowColor,
    constellationAnimation: project.constellationAnimation ?? 'rotation',
    cardTheme: project.cardTheme,
    cardColors: project.cardColors,
    envelopeSettings: project.envelopeSettings,
    deviceLayouts: project.deviceLayouts,
    stars: standaloneStars,
    connections: sanitizeConnections(project.connections, project.stars),
    finalMessage: project.finalMessage,
    finalTextStyle: project.finalTextStyle,
    finalDecor: project.finalDecor,
    musicPath,
    musicName,
  };

  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${escapeHtmlText(project.title)} — GiftLab</title>
  <style>
  ${fontFaceCss}
  ${STANDALONE_CSS}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>window.__GIFTLAB_PAYLOAD__ = ${safeJsonForScriptTag(payload)};</script>
  <script>${runtimeBundle}</script>
</body>
</html>`;

  zip.file('index.html', html);

  const instructions = [
    `${project.title}`,
    '==============================',
    '',
    'Как открыть подарок:',
    '1. Скачайте ZIP-архив.',
    '2. Распакуйте его.',
    '3. Откройте папку.',
    '4. Запустите файл index.html через браузер.',
    '5. Нажмите «Открыть послание» и зажигайте звёзды одну за другой.',
    '6. В финале вращайте готовое созвездие и при желании включите музыку.',
    '',
    'Важно: не отделяйте файл index.html от папки assets — в ней хранятся иллюстрации и музыка подарка.',
  ].join('\n');

  zip.file('ИНСТРУКЦИЯ.txt', instructions);

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    blob,
    filename: `${sanitizeFileName(project.title)}.zip`,
  };
}
