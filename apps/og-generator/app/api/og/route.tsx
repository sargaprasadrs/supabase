import { ImageResponse } from 'next/og'

import { resolveIcon } from '@/lib/supabase/assets'
import { getBrand, color } from '@/lib/design/brands'
import { satoriFonts, measurementFont } from '@/lib/design/fonts'
import { getFormat } from '@/lib/design/formats'
import { iconDataUri } from '@/lib/design/icons'
import {
  PATTERN_SCALE_PX,
  clampPatternOpacity,
  patternDataUri,
  type PatternColor,
  type PatternConfig,
  type PatternScale,
  type PatternType,
} from '@/lib/design/patterns'
import {
  DEFAULT_TEMPLATE_ID,
  TEMPLATE_MAP,
  type TemplateDefaultPattern,
} from '@/lib/design/templates'
import { typography } from '@/lib/design/tokens'
import { fitHeadline } from '@/lib/text/fit-headline'
import { toSentenceCase } from '@/lib/text/sentence-case'

// Node runtime so we can read the self-hosted Manrope files from disk and parse
// them with fontkit for measurement (brief §2 — no Google Fonts at request time).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_HEADLINE = 'Postgres full text search just got faster'

const HEADLINE = typography.roles.headline
const EYEBROW = typography.roles.eyebrow

/** Scale (naturalW, naturalH) to fit within a boxSize square, preserving aspect ratio. */
function fitBox(naturalW: number, naturalH: number, boxSize: number): { width: number; height: number } {
  const ratio = naturalW / naturalH || 1
  return ratio >= 1 ? { width: boxSize, height: boxSize / ratio } : { width: boxSize * ratio, height: boxSize }
}

const THUMB_PATTERN_FALLBACK: TemplateDefaultPattern = {
  type: 'none',
  scale: 'md',
  color: 'white',
  opacity: 0.06,
}

const CORS_AND_CACHE = {
  'access-control-allow-origin': '*',
  'cache-control': 'no-store, max-age=0',
}

const PATTERN_TYPES: PatternType[] = ['grid', 'dots', 'hlines', 'vlines']
const PATTERN_SCALES: PatternScale[] = ['sm', 'md', 'lg']
const PATTERN_COLORS: PatternColor[] = ['white', 'green']

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const brand = getBrand(searchParams.get('brand'))
    const format = getFormat(searchParams.get('format'))
    const ICON_STROKE = brand.illustration.defaultStrokePx

    const scale = searchParams.get('scale') === '2' ? 2 : 1
    const s = scale
    const W = format.width * s
    const H = format.height * s
    const padX = format.headlineInset.x * s
    const padY = format.headlineInset.y * s
    const bg = color('bg.primary', brand)

    const iconName = searchParams.get('icon')
    // Seed icons first, then uploaded assets from Supabase (brief §6).
    const iconObj = iconName ? await resolveIcon(iconName, brand.id) : null
    const type = searchParams.get('type') === 'thumb' ? 'thumb' : 'og'

    // Resolve the background pattern from query params, falling back to a default
    // (the per-template default for OG, or "none" for thumb).
    const resolvePattern = (fallback: TemplateDefaultPattern): PatternConfig => {
      const raw = searchParams.get('pattern')
      if (raw === null) return fallback
      if (raw === 'none') return { ...fallback, type: 'none' }
      const type = (PATTERN_TYPES as string[]).includes(raw) ? (raw as PatternType) : fallback.type
      const scaleParam = searchParams.get('patternScale')
      const colorParam = searchParams.get('patternColor')
      const opacityParam = searchParams.get('patternOpacity')
      return {
        type,
        scale: (PATTERN_SCALES as string[]).includes(scaleParam ?? '')
          ? (scaleParam as PatternScale)
          : fallback.scale,
        color: (PATTERN_COLORS as string[]).includes(colorParam ?? '')
          ? (colorParam as PatternColor)
          : fallback.color,
        opacity: opacityParam ? clampPatternOpacity(Number(opacityParam)) : fallback.opacity,
      }
    }

    const patternLayer = (cfg: PatternConfig, offsetX = 0, offsetY = 0) => {
      if (cfg.type === 'none') return null
      const uri = patternDataUri({ ...cfg, width: W, height: H, scaleFactor: s, offsetX, offsetY })
      // eslint-disable-next-line @next/next/no-img-element
      return <img width={W} height={H} src={uri} style={{ position: 'absolute', top: 0, left: 0 }} />
    }

    // ---- Thumb variant: same canvas + icon system, no text layer (brief §3) -
    if (type === 'thumb') {
      const thumb = format.thumb ?? { default: 380, min: 160, max: 480 }
      const thumbNum = Number(searchParams.get('thumbSize'))
      const thumbSize = Number.isFinite(thumbNum)
        ? Math.min(thumb.max, Math.max(thumb.min, Math.round(thumbNum)))
        : thumb.default
      const cfg = resolvePattern(THUMB_PATTERN_FALLBACK)

      const thumbRoot = (
        <div
          style={{
            position: 'relative',
            width: W,
            height: H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: bg,
          }}
        >
          {patternLayer(cfg)}
          {iconObj && iconObj.kind === 'logo' && iconObj.url ? (
            // Custom color logo — rendered as-is (no stroke normalization),
            // fit to its natural aspect ratio (brief follow-up: partnerships).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              {...fitBox(iconObj.width ?? 1, iconObj.height ?? 1, thumbSize * s)}
              src={iconObj.url}
            />
          ) : iconObj ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              width={thumbSize * s}
              height={thumbSize * s}
              src={iconDataUri(iconObj, {
                sizePx: thumbSize * s,
                strokePx: ICON_STROKE * s,
                color: color('illustration.stroke', brand),
              })}
            />
          ) : null}
        </div>
      )

      return new ImageResponse(thumbRoot, {
        width: W,
        height: H,
        headers: {
          ...CORS_AND_CACHE,
          'x-og-template': 'thumb',
          'x-og-pattern': cfg.type,
          'x-og-has-icon': String(!!iconObj),
        },
      })
    }

    // ---- OG image (template-driven) -----------------------------------------
    const template = TEMPLATE_MAP[searchParams.get('template') ?? ''] ?? TEMPLATE_MAP[DEFAULT_TEMPLATE_ID]

    const rawHeadline = (searchParams.get('headline') ?? DEFAULT_HEADLINE).slice(0, 200)
    const eyebrow = searchParams.get('eyebrow')?.trim() || null
    const eyebrowPill = searchParams.get('eyebrowStyle') === 'pill'
    const sentenceCase = searchParams.get('sentenceCase') !== '0'
    const manualBreaks = searchParams.get('manual') === '1' || /\n/.test(rawHeadline)

    // Manual font-size override (brief §3 power-user mode). Guard the absent case
    // — Number(null) === 0 would wrongly pin every auto-fit render to the min.
    const fontSizeParam = searchParams.get('fontSize')
    const manualSizeNum = fontSizeParam ? Number(fontSizeParam) : NaN
    const manualSize = Number.isFinite(manualSizeNum)
      ? Math.min(HEADLINE.maxSize, Math.max(HEADLINE.minSize, Math.round(manualSizeNum)))
      : null

    const hasIcon = !!iconObj
    const centerText = template.textAlign === 'center'
    const headline = sentenceCase ? toSentenceCase(rawHeadline) : rawHeadline

    const headlineFont = await measurementFont(HEADLINE.weight)
    const fit = fitHeadline(headline, headlineFont, {
      boxWidth: template.headlineBox(format),
      minSize: manualSize ?? HEADLINE.minSize,
      maxSize: manualSize ?? HEADLINE.maxSize,
      step: 2,
      maxLines: 2,
      letterSpacingEm: HEADLINE.letterSpacing,
      manualBreaks,
    })

    const headlineSize = fit.fontSize * s
    const headlineLineHeight = Math.round(headlineSize * HEADLINE.lineHeight)
    const headlineLetterSpacing = HEADLINE.letterSpacing * headlineSize
    const eyebrowSize = EYEBROW.size * s
    const eyebrowLetterSpacing = EYEBROW.letterSpacing * eyebrowSize
    const eyebrowGap = 16 * s

    const fonts = await satoriFonts([...new Set([EYEBROW.weight, HEADLINE.weight])])

    const textBlock = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: centerText ? 'center' : 'flex-start',
        }}
      >
        {eyebrow ? (
          <div
            style={{
              display: 'flex',
              marginBottom: eyebrowGap,
              color: color('brand.default', brand),
              fontSize: eyebrowSize,
              fontWeight: EYEBROW.weight,
              letterSpacing: eyebrowLetterSpacing,
              textTransform: 'uppercase',
              ...(eyebrowPill
                ? {
                    backgroundColor: color('brand.tint', brand),
                    borderRadius: 999,
                    padding: `${8 * s}px ${18 * s}px`,
                  }
                : {}),
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: centerText ? 'center' : 'flex-start',
          }}
        >
          {fit.lines.map((line, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                whiteSpace: 'nowrap', // render exactly the line we computed
                color: color('text.primary', brand),
                fontSize: headlineSize,
                fontWeight: HEADLINE.weight,
                lineHeight: `${headlineLineHeight}px`,
                letterSpacing: headlineLetterSpacing,
              }}
            >
              {line || ' '}
            </div>
          ))}
        </div>
      </div>
    )

    const iconEl =
      iconObj && iconObj.kind === 'logo' && iconObj.url ? (
        // Custom color logo — rendered as-is, fit to its natural aspect ratio.
        // eslint-disable-next-line @next/next/no-img-element
        <img {...fitBox(iconObj.width ?? 1, iconObj.height ?? 1, format.iconSize * s)} src={iconObj.url} />
      ) : iconObj ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          width={format.iconSize * s}
          height={format.iconSize * s}
          src={iconDataUri(iconObj, {
            sizePx: format.iconSize * s,
            strokePx: ICON_STROKE * s,
            color: color('illustration.stroke', brand),
          })}
        />
      ) : null

    const cfg = resolvePattern(template.defaultPattern)
    // Grid-snap (§4): phase the pattern so a grid line lands on the safe-area
    // inset, anchoring the composition's left/top edges to the background grid.
    const gridUnit = PATTERN_SCALE_PX[cfg.scale] * s

    // padY / H-padY mark the invisible LAYOUT BOX edge, but CSS line-height
    // leading means the visible glyph ink sits a bit inside that edge — the
    // grid should snap to where the text actually LOOKS like it starts/ends,
    // not the box. Derived from the real Manrope metrics (already loaded for
    // the auto-fit measurement above), not a guessed pixel constant, so it
    // stays correct across every font size auto-fit picks.
    const unitsPerEm = headlineFont.unitsPerEm
    const ascentPx = (headlineFont.ascent / unitsPerEm) * headlineSize
    const descentPx = (Math.abs(headlineFont.descent) / unitsPerEm) * headlineSize
    const capHeightPx = (headlineFont.capHeight / unitsPerEm) * headlineSize
    const halfLeading = (headlineLineHeight - (ascentPx + descentPx)) / 2
    const visualTopInset = halfLeading + ascentPx - capHeightPx // box top -> cap-height top
    const visualBottomInset = halfLeading + descentPx // box bottom -> baseline

    // Grid-snap on BOTH axes: align a grid line to where THIS template's content
    // actually sits (left/center × top/center/bottom), not just the top-left.
    const anchorPxX = template.anchorX === 'center' ? W / 2 : padX
    const anchorPxY =
      template.anchorY === 'center'
        ? H / 2
        : template.anchorY === 'bottom'
          ? H - padY - visualBottomInset
          : padY + visualTopInset
    const patternOffX = ((anchorPxX % gridUnit) + gridUnit) % gridUnit
    const patternOffY = ((anchorPxY % gridUnit) + gridUnit) % gridUnit

    const root = template.build({
      W,
      H,
      padX,
      padY,
      bg,
      scaleFactor: s,
      textBlock,
      iconEl,
      patternLayer: patternLayer(cfg, patternOffX, patternOffY),
      hasIcon,
    })

    return new ImageResponse(root, {
      width: W,
      height: H,
      fonts,
      headers: {
        ...CORS_AND_CACHE,
        'x-og-font-size': String(fit.fontSize),
        'x-og-line-count': String(fit.lineCount),
        'x-og-fits': String(fit.fits),
        'x-og-overflow': String(fit.overflow),
        'x-og-mode': fit.mode,
        'x-og-widest-line-px': String(fit.widestLinePx),
        'x-og-template': template.id,
        'x-og-pattern': cfg.type,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(`OG render failed: ${message}`, {
      status: 500,
      headers: { 'content-type': 'text/plain' },
    })
  }
}
