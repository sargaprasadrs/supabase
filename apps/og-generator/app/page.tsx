'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { ICON_LIBRARY } from '@/lib/assets/icon-library'
import { type SeedIcon } from '@/lib/assets/seed-icons'
import { BRAND_OPTIONS, DEFAULT_BRAND_ID, type BrandId } from '@/lib/design/brands'
import { DEFAULT_FORMAT_ID, FORMAT_OPTIONS, getFormat, type FormatId } from '@/lib/design/formats'
import {
  DEFAULT_NEWSLETTER_TEMPLATE_ID,
  DEFAULT_SOCIAL_TEMPLATE_ID,
  DEFAULT_TEMPLATE_ID,
  NEWSLETTER_TEMPLATES,
  SOCIAL_TEMPLATES,
  TEMPLATES,
} from '@/lib/design/templates'
import { IN_CONTEXT_OPTS, InContextPreview, type InContextMode } from './InContextPreview'

/**
 * Editor. State maps 1:1 to /api/og query params (the stateless recipe, §6.9).
 * "Both" renders the OG and Thumb together from two independent renders.
 */

const SOFT_LIMIT = 60
const HARD_LIMIT = 70

/** Safe-area guide: a uniform 80px margin on every side, regardless of format. */
function safeAreaInset(width: number, height: number) {
  return { x: (80 / width) * 100, y: (80 / height) * 100 }
}

type View = 'og' | 'thumb' | 'both'

const VIEW_OPTS: { value: View; label: string }[] = [
  { value: 'og', label: 'OG' },
  { value: 'thumb', label: 'Thumb' },
  { value: 'both', label: 'Both' },
]

interface FitInfo {
  fontSize: number
  lineCount: number
  fits: boolean
  overflow: boolean
  mode: string
  widest: number
}

function Hint({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="ml-1 inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-default align-middle text-[9px] leading-none text-foreground-lighter"
    >
      ?
    </span>
  )
}

// Section header — deliberately dominant (bold, uppercase, dark, with a divider)
// so it reads clearly above the lighter option labels within each section.
function Group({
  title,
  children,
  noDivider,
}: {
  title: string
  children: React.ReactNode
  noDivider?: boolean
}) {
  return (
    <section
      className={`flex flex-col gap-3 pt-5 first:pt-0 ${
        noDivider ? '' : 'border-t border-default first:border-t-0'
      }`}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-default bg-surface-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded px-2.5 py-1 text-xs ${
            value === o.value
              ? 'bg-surface-300 text-foreground'
              : 'text-foreground-light hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Small illustrative diagram of where the headline/icon sit for a template. */
function LayoutThumb({ id }: { id: string }) {
  const iconBox = <div className="absolute h-3 w-3 rounded-sm bg-surface-300" />
  const bars = (align: 'items-start' | 'items-center') => (
    <div className={`absolute flex flex-col gap-0.5 ${align}`}>
      <div className="h-1 w-6 rounded-full bg-foreground-lighter" />
      <div className="h-1 w-4 rounded-full bg-foreground-lighter" />
    </div>
  )
  switch (id) {
    case 'split-right':
      return (
        <div className="relative h-full w-full">
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2">{bars('items-start')}</div>
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{iconBox}</div>
        </div>
      )
    case 'social-instagram':
    case 'centered':
      return (
        <div className="relative h-full w-full">
          <div className="absolute left-1/2 top-1.5 -translate-x-1/2">{iconBox}</div>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">{bars('items-center')}</div>
        </div>
      )
    case 'stacked':
      return (
        <div className="relative h-full w-full">
          <div className="absolute left-1.5 top-1.5">{bars('items-start')}</div>
          <div className="absolute bottom-1.5 right-1.5">{iconBox}</div>
        </div>
      )
    case 'newsletter-section':
      return (
        <div className="relative h-full w-full">
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2">{iconBox}</div>
          <div className="absolute left-6 top-1/2 h-1 w-6 -translate-y-1/2 rounded-full bg-foreground-lighter" />
        </div>
      )
    case 'newsletter-cover':
    case 'social-twitter':
    case 'bottom-left':
    default:
      return (
        <div className="relative h-full w-full">
          <div className="absolute right-1.5 top-1.5">{iconBox}</div>
          <div className="absolute bottom-1.5 left-1.5">{bars('items-start')}</div>
        </div>
      )
  }
}

/** Debounced fetch of a render endpoint → object URL + fit metadata from headers. */
function useRenderedImage(endpoint: string, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null)
  const [fit, setFit] = useState<FitInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevUrl = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const id = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(endpoint, { cache: 'no-store' })
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
        const blob = await res.blob()
        if (cancelled) return
        const u = URL.createObjectURL(blob)
        if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
        prevUrl.current = u
        setUrl(u)
        setFit({
          fontSize: Number(res.headers.get('x-og-font-size')),
          lineCount: Number(res.headers.get('x-og-line-count')),
          fits: res.headers.get('x-og-fits') === 'true',
          overflow: res.headers.get('x-og-overflow') === 'true',
          mode: res.headers.get('x-og-mode') ?? 'auto',
          widest: Number(res.headers.get('x-og-widest-line-px')),
        })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to render')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [endpoint, enabled])

  useEffect(() => () => { if (prevUrl.current) URL.revokeObjectURL(prevUrl.current) }, [])

  return { url, fit, loading, error }
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="12" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExportRow({
  label,
  endpoint,
  imgUrl,
  downloadName,
  copied,
  onCopy,
  onDownload,
}: {
  label: string
  endpoint: string
  imgUrl: string | null
  downloadName: string
  copied: boolean
  onCopy: () => void
  onDownload: () => void
}) {
  const abs = typeof window !== 'undefined' ? window.location.origin + endpoint : endpoint
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-foreground-light">{label}</span>
      <div className="flex gap-2">
        <input
          readOnly
          value={abs}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 truncate rounded-md border border-default bg-surface-100 px-3 py-2 text-xs text-foreground-light outline-none focus:border-strong"
        />
        <button
          onClick={onCopy}
          title="Copy URL"
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-default bg-surface-100 px-2.5 py-1 text-xs text-foreground hover:border-strong"
        >
          <CopyIcon />
          {copied ? 'Copied!' : ''}
        </button>
        <button
          onClick={onDownload}
          disabled={!imgUrl}
          title="Download"
          className="flex shrink-0 items-center justify-center rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-background hover:bg-brand/90 disabled:opacity-50"
        >
          <DownloadIcon />
        </button>
      </div>
    </div>
  )
}

function ExportModal({
  onClose,
  scale,
  setScale,
  rows,
}: {
  onClose: () => void
  scale: 1 | 2
  setScale: (s: 1 | 2) => void
  rows: {
    label: string
    endpoint: string
    imgUrl: string | null
    downloadName: string
    copied: boolean
    onCopy: () => void
    onDownload: () => void
  }[]
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex w-[440px] flex-col gap-4 rounded-xl border border-default bg-background p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Export images</span>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-foreground-light hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground-light">
          <input
            type="checkbox"
            checked={scale === 2}
            onChange={(e) => setScale(e.target.checked ? 2 : 1)}
          />
          Export @2x
        </label>

        <div className="flex flex-col gap-4 border-t border-default pt-4">
          {rows.map((r) => (
            <ExportRow key={r.label} {...r} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PreviewCard({
  label,
  width,
  height,
  imgUrl,
  loading,
  error,
  alt,
  showSafeArea,
  children,
}: {
  label: string
  width: number
  height: number
  imgUrl: string | null
  loading: boolean
  error: string | null
  alt: string
  showSafeArea: boolean
  children?: React.ReactNode
}) {
  const safeArea = safeAreaInset(width, height)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-medium text-foreground-light">
        {label}
        <span className="ml-2 font-normal text-foreground-lighter">
          {width} × {height}
          {loading ? ' · rendering…' : ''}
        </span>
      </span>

      <div
        className="relative w-full overflow-hidden rounded-lg border border-default bg-surface-100"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {imgUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt={alt} className="h-full w-full" />
        )}
        {showSafeArea && (
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute border border-dotted border-brand/40"
              style={{
                top: `${safeArea.y}%`,
                bottom: `${safeArea.y}%`,
                left: `${safeArea.x}%`,
                right: `${safeArea.x}%`,
              }}
            />
          </div>
        )}
      </div>

      {children}

      {error && (
        <pre className="overflow-x-auto rounded-md border border-destructive-400 bg-destructive-200 p-3 text-xs text-destructive-600">
          {error}
        </pre>
      )}
    </div>
  )
}

export default function Page() {
  const [brandId, setBrandId] = useState<BrandId>(DEFAULT_BRAND_ID)
  const [formatId, setFormatId] = useState<FormatId>(DEFAULT_FORMAT_ID)
  const format = useMemo(() => getFormat(formatId), [formatId])
  const hasThumb = !!format.thumb
  // Newsletter and Social each have their own two-tile layout set instead
  // of the standard 4 templates.
  const activeTemplates =
    formatId === 'newsletter' ? NEWSLETTER_TEMPLATES : formatId === 'twitter' ? SOCIAL_TEMPLATES : TEMPLATES

  const [view, setView] = useState<View>('both')
  const [headline, setHeadline] = useState('Postgres full text search just got faster')
  const [eyebrow, setEyebrow] = useState('Engineering')
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE_ID)
  const [icon, setIcon] = useState<string | null>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const iconPickerRef = useRef<HTMLDivElement>(null)
  const [uploadedIcons, setUploadedIcons] = useState<SeedIcon[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const allIcons = useMemo(() => [...ICON_LIBRARY, ...uploadedIcons], [uploadedIcons])
  const selectedIcon = useMemo(() => allIcons.find((i) => i.name === icon) ?? null, [allIcons, icon])

  // Load the shared asset library (uploaded icons) for the active brand; empty
  // when Supabase is off.
  useEffect(() => {
    fetch(`/api/assets?brand=${brandId}`)
      .then((r) => r.json())
      .then((d) => setUploadedIcons(d.assets ?? []))
      .catch(() => {})
  }, [brandId])

  // Newsletter/Social swap in their own layout sets — reset to a valid
  // default when the active template isn't in the set the current format offers.
  useEffect(() => {
    if (!activeTemplates.some((t) => t.id === template)) {
      setTemplate(
        formatId === 'newsletter'
          ? DEFAULT_NEWSLETTER_TEMPLATE_ID
          : formatId === 'twitter'
            ? DEFAULT_SOCIAL_TEMPLATE_ID
            : DEFAULT_TEMPLATE_ID
      )
    }
  }, [formatId, activeTemplates, template])

  // Format may drop the Thumb view (e.g. Twitter) — fall back to OG.
  useEffect(() => {
    if (!hasThumb && view === 'thumb') setView('og')
  }, [hasThumb, view])

  // Close the icon dropdown on an outside click, like a real dropdown.
  useEffect(() => {
    if (!iconPickerOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) {
        setIconPickerOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [iconPickerOpen])

  // "Z" toggles the zoom tool; Escape cancels it; Alt (while active) flips
  // the cursor/click direction from zoom-in to zoom-out, matching
  // Illustrator/Photoshop. Ignored while typing in a text field.
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setAltHeld(true)
        return
      }
      if (isTyping(e.target)) return
      if (e.key === 'Escape') {
        setZoomToolActive(false)
      } else if ((e.key === 'z' || e.key === 'Z') && !e.metaKey && !e.ctrlKey) {
        setZoomToolActive((v) => !v)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltHeld(false)
    }
    // Alt can be released outside the window (e.g. after alt-tabbing) —
    // clear the stuck state once focus returns.
    const onBlur = () => setAltHeld(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const handleCanvasZoomClick = (e: React.MouseEvent) => {
    if (!zoomToolActive) return
    if (e.altKey) {
      setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))
    } else {
      setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))
    }
  }

  const uploadSvg = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('brand', brandId)
      const res = await fetch('/api/assets', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error ?? 'Upload failed')
        return
      }
      setUploadedIcons((prev) => [data.asset as SeedIcon, ...prev])
      setIcon((data.asset as SeedIcon).name)
    } catch {
      setUploadError('Upload failed — please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Custom color logos (partnerships, acquisitions, co-marketing) — rendered
  // full-color, no stroke normalization. The browser measures natural pixel
  // size before upload so /api/og can fit it without distortion.
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const uploadLogo = async (file: File) => {
    setUploadingLogo(true)
    setLogoError(null)
    try {
      const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight })
          URL.revokeObjectURL(url)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('Could not read the image — is it a valid SVG/PNG/JPEG/WebP?'))
        }
        img.src = url
      })
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', 'logo')
      fd.append('brand', brandId)
      fd.append('width', String(width))
      fd.append('height', String(height))
      const res = await fetch('/api/assets', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setLogoError(data.error ?? 'Upload failed')
        return
      }
      setUploadedIcons((prev) => [data.asset as SeedIcon, ...prev])
      setIcon((data.asset as SeedIcon).name)
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Upload failed — please try again.')
    } finally {
      setUploadingLogo(false)
    }
  }
  const [scale, setScale] = useState<1 | 2>(1)
  const [showSafeArea, setShowSafeArea] = useState(false)
  const [inContext, setInContext] = useState<InContextMode>('none')
  const [exportOpen, setExportOpen] = useState(false)
  // Canvas zoom (brief follow-up) — scales the rendered image cards
  // themselves, not the surrounding UI/controls.
  const [zoom, setZoom] = useState(100)
  const ZOOM_MIN = 25
  const ZOOM_MAX = 200
  const ZOOM_STEP = 25
  // "Z" zoom tool (brief follow-up, Illustrator/Photoshop-style): toggles a
  // zoom cursor over the canvas; click to zoom in, Alt+click to zoom out.
  const [zoomToolActive, setZoomToolActive] = useState(false)
  const [altHeld, setAltHeld] = useState(false)

  const [copied, setCopied] = useState<View | null>(null)

  const showOg = view !== 'thumb'
  const showThumb = view !== 'og' && hasThumb

  const ogEndpoint = useMemo(() => {
    const p = new URLSearchParams()
    if (brandId !== DEFAULT_BRAND_ID) p.set('brand', brandId)
    if (formatId !== DEFAULT_FORMAT_ID) p.set('format', formatId)
    p.set('headline', headline)
    if (eyebrow.trim()) {
      p.set('eyebrow', eyebrow.trim())
      p.set('eyebrowStyle', 'pill')
    }
    p.set('template', template)
    if (icon) p.set('icon', icon)
    if (scale === 2) p.set('scale', '2')
    return `/api/og?${p.toString()}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, formatId, headline, eyebrow, template, icon, scale])

  const thumbEndpoint = useMemo(() => {
    const p = new URLSearchParams()
    if (brandId !== DEFAULT_BRAND_ID) p.set('brand', brandId)
    if (formatId !== DEFAULT_FORMAT_ID) p.set('format', formatId)
    p.set('type', 'thumb')
    if (icon) p.set('icon', icon)
    if (scale === 2) p.set('scale', '2')
    return `/api/og?${p.toString()}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, formatId, icon, scale])

  const og = useRenderedImage(ogEndpoint, showOg)
  const thumb = useRenderedImage(thumbEndpoint, showThumb)

  const count = [...headline].length
  const counterColor =
    count > HARD_LIMIT
      ? 'text-destructive-600'
      : count >= SOFT_LIMIT
        ? 'text-warning-600'
        : 'text-foreground-lighter'

  const copyUrl = async (endpoint: string, key: View) => {
    const abs = typeof window !== 'undefined' ? window.location.origin + endpoint : endpoint
    await navigator.clipboard.writeText(abs)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const download = (url: string | null, name: string) => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
  }

  const suffix = scale === 2 ? '@2x' : ''

  return (
    <div className="relative h-full overflow-hidden bg-background text-foreground">
      {/* Canvas — one continuous full-bleed dot-grid surface; the tool panel
          floats on top of it (absolutely positioned), not beside it. Scrolls
          independently of the two floating toolbars below, which are their
          own siblings so they stay anchored regardless of scroll position. */}
      <main
        className="@container absolute inset-0 flex flex-col items-center overflow-auto p-8 pt-24 pb-24 pr-[380px]"
        onClick={handleCanvasZoomClick}
        style={{
          backgroundColor: '#f4f4f5',
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          cursor: zoomToolActive ? (altHeld ? 'zoom-out' : 'zoom-in') : undefined,
        }}
      >
        {inContext === 'none' ? (
          /* Fills the remaining canvas height; on wide/side-by-side screens
              the row centers within it. (flex-1 items don't shrink below
              their content, so this can't clip an overflowing row — it just
              grows.) */
          <div
            className={`flex w-full flex-1 flex-col @4xl:justify-center ${
              zoom > 100 ? 'items-start' : 'items-center'
            }`}
          >
            <div
              className="flex flex-col gap-6 @4xl:flex-row @4xl:items-start"
              style={{ width: `${Math.round((view === 'both' ? 100 : 65) * (zoom / 100))}%` }}
            >
              {showOg && (
                <div className="min-w-0 @4xl:flex-1">
                  <PreviewCard
                    label={format.label}
                    width={format.width}
                    height={format.height}
                    imgUrl={og.url}
                    loading={og.loading}
                    error={og.error}
                    alt={headline}
                    showSafeArea={showSafeArea}
                  />
                </div>
              )}

              {showThumb && (
                <div className="min-w-0 @4xl:flex-1">
                  <PreviewCard
                    label="Thumb"
                    width={format.width}
                    height={format.height}
                    imgUrl={thumb.url}
                    loading={thumb.loading}
                    error={thumb.error}
                    alt="Thumbnail preview"
                    showSafeArea={showSafeArea}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* In-context preview takes over the full canvas — the OG/Thumb
              rectangles aren't the point here, seeing it "in the wild" is. */
          <div className="flex w-full flex-1 flex-col items-center justify-center">
            <div className="flex w-full max-w-2xl flex-col gap-2">
              <span className="text-xs font-medium text-foreground-light">
                {IN_CONTEXT_OPTS.find((o) => o.value === inContext)?.label}
              </span>
              <InContextPreview
                mode={inContext}
                imgUrl={og.url}
                headline={headline}
                eyebrow={eyebrow.trim() || null}
                aspect={`${format.width} / ${format.height}`}
              />
            </div>
          </div>
        )}
      </main>

      {/* View toggle — anchored to the top of the canvas, independent of
          main's scroll (a sibling, not a child of the scroll container). */}
      <div className="pointer-events-none absolute left-8 right-[380px] top-6 z-10 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-3 rounded-md border border-default bg-background px-3 py-2 shadow-lg">
          <Segmented
            value={view}
            onChange={setView}
            options={hasThumb ? VIEW_OPTS : VIEW_OPTS.filter((o) => o.value !== 'thumb')}
          />
        </div>
      </div>

      {/* Canvas zoom — bottom-right corner, independent of the centered
          toolbar. Same height/padding as that toolbar so the two visually
          center-align against the shared bottom-6 offset. Scales the image
          cards themselves (via the row's width style above), not the
          surrounding controls. */}
      {inContext === 'none' && (
        <div className="pointer-events-none absolute bottom-6 right-[380px] z-10 flex">
          <div
            className={`pointer-events-auto flex items-center gap-2 rounded-md border px-3 py-2 shadow-lg ${
              zoomToolActive ? 'border-brand bg-brand/10' : 'border-default bg-background'
            }`}
          >
            <button
              type="button"
              onClick={() => setZoomToolActive((v) => !v)}
              title="Zoom tool (Z) — click to zoom in, Alt+click to zoom out"
              className={`flex h-7 w-7 items-center justify-center rounded ${
                zoomToolActive ? 'bg-brand/20 text-brand' : 'text-foreground-light hover:text-foreground'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                <path d="M8 11h6" strokeLinecap="round" />
                {!altHeld && <path d="M11 8v6" strokeLinecap="round" />}
              </svg>
            </button>
            <div className="h-5 border-l border-default" />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
              disabled={zoom <= ZOOM_MIN}
              title="Zoom out"
              className="flex h-7 w-7 items-center justify-center rounded text-foreground-light hover:text-foreground disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              title="Reset zoom"
              className="min-w-[3ch] px-1 text-center text-xs tabular-nums text-foreground-light hover:text-foreground"
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
              disabled={zoom >= ZOOM_MAX}
              title="Zoom in"
              className="flex h-7 w-7 items-center justify-center rounded text-foreground-light hover:text-foreground disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating guides / view-in-context toolbar — bottom-aligned, centered
          on the same content box as the View toggle above, and likewise
          anchored outside main's scroll container. */}
      <div className="pointer-events-none absolute bottom-6 left-8 right-[380px] z-10 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-3 rounded-md border border-default bg-background px-3 py-2 shadow-lg">
          <button
            type="button"
            onClick={() => setShowSafeArea((v) => !v)}
            title="Show safe-area guide"
            className={`flex h-7 w-7 items-center justify-center rounded ${
              showSafeArea ? 'bg-surface-300 text-foreground' : 'text-foreground-light hover:text-foreground'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="0.1 4.2" strokeLinecap="round" />
            </svg>
          </button>
          {showOg && (
            <>
              <div className="h-5 border-l border-default" />
              <span className="pl-1 text-xs font-medium text-foreground-light">Preview</span>
              <Segmented value={inContext} onChange={setInContext} options={IN_CONTEXT_OPTS} />
            </>
          )}
        </div>
      </div>

      {/* Floating tool panel — packaged top bar + all controls, docked right.
          Absolutely positioned (not a flex sibling) so the canvas behind it
          is one continuous surface, not two boxes split by a shared edge. */}
      <aside className="absolute right-4 top-4 bottom-4 z-10 flex w-[340px] flex-col overflow-hidden rounded-xl border border-default bg-background shadow-lg">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-default px-5">
          <span className="text-sm font-medium text-foreground">Supaimage</span>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-background hover:bg-brand/90"
          >
            Export
          </button>
        </div>
        <div className="flex flex-col overflow-y-auto overflow-x-hidden p-5">
          <Group title="Brand & format">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground-light">Brand</span>
              <Segmented
                value={brandId}
                onChange={setBrandId}
                options={BRAND_OPTIONS.map((b) => ({ value: b.id, label: b.label }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground-light">Format</span>
              <Segmented
                value={formatId}
                onChange={setFormatId}
                options={FORMAT_OPTIONS.map((f) => ({ value: f.id, label: f.label }))}
              />
            </div>
          </Group>

          {showOg && (
            <Group title="Layout" noDivider>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {activeTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplate(t.id)}
                      title={t.label}
                      className={`flex h-16 flex-col rounded-md border p-1.5 ${
                        template === t.id
                          ? 'border-brand bg-brand/10'
                          : 'border-default bg-surface-100 hover:border-strong'
                      }`}
                    >
                      <div className="relative flex-1">
                        <LayoutThumb id={t.id} />
                      </div>
                      <span
                        className={`truncate text-[10px] ${
                          template === t.id ? 'text-brand' : 'text-foreground-lighter'
                        }`}
                      >
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Group>
          )}

          <Group title="Content" noDivider>
            {showOg && (
              <div className="flex flex-col gap-2">
                <label htmlFor="eyebrow" className="text-sm font-medium text-foreground-light">
                  Eyebrow <span className="text-foreground-lighter">(optional)</span>
                </label>
                <input
                  id="eyebrow"
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  className="rounded-md border border-default bg-surface-100 px-3 py-2 text-sm text-foreground outline-none focus:border-strong"
                  placeholder="e.g. Launch Week, Engineering"
                />
              </div>
            )}

            {showOg && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="headline" className="text-sm font-medium text-foreground-light">
                    Headline
                  </label>
                  <span className={`text-xs tabular-nums ${counterColor}`}>
                    {count} / {HARD_LIMIT}
                  </span>
                </div>
                <textarea
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  rows={3}
                  className="resize-none rounded-md border border-default bg-surface-100 px-3 py-2 text-sm text-foreground outline-none focus:border-strong"
                  placeholder="Type a blog headline…"
                />
                <p className="text-xs text-foreground-lighter">
                  Press Enter for a manual line break. Sentence case is applied automatically — wrap
                  text in [brackets] to keep its exact casing (e.g. type "[P]ostgreSQL").
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground-light">
                Icon
                <Hint text="Line-art icons only, stroke locked to the illustration weight (§4). Logos (SVG, PNG, JPEG, WebP) keep their original colors, for partnerships/acquisitions. The icon is shared between the OG and Thumb. Both are stored in Supabase and need the secret key configured." />
              </span>
              <div className="relative" ref={iconPickerRef}>
                <button
                  type="button"
                  onClick={() => setIconPickerOpen((o) => !o)}
                  className="flex w-full items-center gap-2 rounded-md border border-default bg-surface-100 px-3 py-2 text-sm text-foreground outline-none hover:border-strong focus:border-strong"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-default bg-background text-foreground-light">
                    {selectedIcon ? (
                      selectedIcon.kind === 'logo' && selectedIcon.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedIcon.url}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <svg
                          width={14}
                          height={14}
                          viewBox={selectedIcon.viewBox}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          dangerouslySetInnerHTML={{ __html: selectedIcon.body }}
                        />
                      )
                    ) : (
                      <span className="text-[9px] text-foreground-lighter">—</span>
                    )}
                  </span>
                  <span className="flex-1 truncate text-left">
                    {selectedIcon ? selectedIcon.label : 'None'}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {iconPickerOpen && (
                  <div className="absolute bottom-full z-20 mb-1 w-full rounded-md border border-default bg-background p-2 shadow-lg">
                    <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setIcon(null)
                          setIconPickerOpen(false)
                        }}
                        title="No icon"
                        className={`flex h-14 items-center justify-center rounded-md border text-xs ${
                          icon === null
                            ? 'border-brand bg-brand/10 text-brand'
                            : 'border-default bg-surface-100 text-foreground-lighter hover:border-strong'
                        }`}
                      >
                        None
                      </button>
                      {allIcons.map((ic) => (
                        <button
                          key={ic.name}
                          type="button"
                          onClick={() => {
                            setIcon(ic.name)
                            setIconPickerOpen(false)
                          }}
                          title={ic.kind === 'logo' ? `${ic.label} (color logo)` : ic.label}
                          className={`flex h-14 items-center justify-center rounded-md border p-1.5 ${
                            icon === ic.name
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-default bg-surface-100 text-foreground-light hover:border-strong'
                          }`}
                        >
                          {ic.kind === 'logo' && ic.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ic.url} alt={ic.label} className="max-h-full max-w-full object-contain" />
                          ) : (
                            <svg
                              width={22}
                              height={22}
                              viewBox={ic.viewBox}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              dangerouslySetInnerHTML={{ __html: ic.body }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label
                        className={`rounded-md border border-dashed border-default px-3 py-2 text-center text-xs text-foreground-light hover:border-strong ${
                          uploading ? 'cursor-wait opacity-70' : 'cursor-pointer'
                        }`}
                      >
                        {uploading ? 'Uploading…' : '+ Upload SVG icon'}
                        <input
                          type="file"
                          accept=".svg,image/svg+xml"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) uploadSvg(f)
                            e.target.value = ''
                          }}
                        />
                      </label>
                      <label
                        className={`rounded-md border border-dashed border-default px-3 py-2 text-center text-xs text-foreground-light hover:border-strong ${
                          uploadingLogo ? 'cursor-wait opacity-70' : 'cursor-pointer'
                        }`}
                      >
                        {uploadingLogo ? 'Uploading…' : '+ Upload logo (color)'}
                        <input
                          type="file"
                          accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
                          className="hidden"
                          disabled={uploadingLogo}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) uploadLogo(f)
                            e.target.value = ''
                          }}
                        />
                      </label>
                    </div>
                    {uploadError && <p className="mt-2 text-xs text-warning-600">{uploadError}</p>}
                    {logoError && <p className="mt-2 text-xs text-warning-600">{logoError}</p>}
                  </div>
                )}
              </div>
            </div>
          </Group>
        </div>
      </aside>

      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          scale={scale}
          setScale={setScale}
          rows={[
            {
              label: format.label,
              endpoint: ogEndpoint,
              imgUrl: og.url,
              downloadName: `og${suffix}.png`,
              copied: copied === 'og',
              onCopy: () => copyUrl(ogEndpoint, 'og'),
              onDownload: () => download(og.url, `og${suffix}.png`),
            },
            ...(hasThumb
              ? [
                  {
                    label: 'Thumb',
                    endpoint: thumbEndpoint,
                    imgUrl: thumb.url,
                    downloadName: `thumb${suffix}.png`,
                    copied: copied === 'thumb',
                    onCopy: () => copyUrl(thumbEndpoint, 'thumb'),
                    onDownload: () => download(thumb.url, `thumb${suffix}.png`),
                  },
                ]
              : []),
          ]}
        />
      )}
    </div>
  )
}
