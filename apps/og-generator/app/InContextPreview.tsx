'use client'

/**
 * "View in situ" mockups (Supaimage in-context preview follow-up).
 *
 * Today's platform-crop preview only shows a cropped rectangle — not what the
 * image looks like in actual use. These are rough, illustrative approximations
 * of real post/listing UI (not pixel-matches to the live platforms/site),
 * embedding the currently-rendered image so switching Brand/Format instantly
 * shows how it reads in context.
 */

export type InContextMode = 'none' | 'twitter' | 'linkedin' | 'blog'

export const IN_CONTEXT_OPTS: { value: InContextMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'blog', label: 'Blog listing' },
]

interface Props {
  imgUrl: string | null
  headline: string
  eyebrow: string | null
  aspect: string
}

function ActionIcon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ICONS = {
  reply: 'M21 12a8 8 0 1 1-3.2-6.4M21 5v5h-5',
  retweet: 'M17 2l4 4-4 4M3 6h13a4 4 0 0 1 4 4v2M7 22l-4-4 4-4M21 18H8a4 4 0 0 1-4-4v-2',
  like: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14',
}

function TwitterCardMockup({ imgUrl, headline, aspect }: Props) {
  return (
    <div className="w-full max-w-[500px] rounded-2xl border border-default bg-background p-4 text-foreground">
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-surface-300" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="font-semibold">Supabase</span>
            <span className="text-foreground-lighter">@supabase · 2h</span>
          </div>
          <p className="mt-1 text-sm text-foreground">{headline}</p>
          {imgUrl && (
            <div
              className="mt-3 w-full overflow-hidden rounded-xl border border-default"
              style={{ aspectRatio: aspect }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="mt-3 flex max-w-[320px] items-center justify-between text-foreground-lighter">
            <ActionIcon d={ICONS.reply} />
            <ActionIcon d={ICONS.retweet} />
            <ActionIcon d={ICONS.like} />
            <ActionIcon d={ICONS.share} />
          </div>
        </div>
      </div>
    </div>
  )
}

function LinkedInCardMockup({ imgUrl, headline, aspect }: Props) {
  return (
    <div className="w-full max-w-[500px] rounded-lg border border-default bg-background p-4 text-foreground">
      <div className="flex gap-3">
        <div className="h-12 w-12 shrink-0 rounded bg-surface-300" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Supabase</div>
          <div className="text-xs text-foreground-lighter">148,203 followers</div>
          <div className="text-xs text-foreground-lighter">2h</div>
        </div>
      </div>
      <p className="mt-3 text-sm text-foreground">{headline}</p>
      {imgUrl && (
        <div className="mt-3 w-full overflow-hidden rounded border border-default" style={{ aspectRatio: aspect }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="mt-1 truncate text-xs text-foreground-lighter">supabase.com</div>
    </div>
  )
}

function BlogListingMockup({ imgUrl, headline, eyebrow, aspect }: Props) {
  const fillerCards = [
    { eyebrow: 'Engineering', title: 'Scaling Postgres connections with Supavisor' },
    { eyebrow: 'Launch Week', title: 'Introducing Edge Functions v2' },
  ]
  return (
    <div className="grid w-full max-w-[760px] grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        { yours: true, eyebrow: eyebrow ?? 'Engineering', title: headline },
        fillerCards[0],
        fillerCards[1],
      ].map((c, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div
            className="w-full overflow-hidden rounded-lg border border-default bg-surface-100"
            style={{ aspectRatio: aspect }}
          >
            {i === 0 && imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-surface-200" />
            )}
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-brand">{c.eyebrow}</span>
          <span className="text-sm font-medium leading-snug text-foreground">{c.title}</span>
          <span className="text-xs text-foreground-lighter">Jul 2, 2026 · 4 min read</span>
        </div>
      ))}
    </div>
  )
}

export function InContextPreview({ mode, ...rest }: Props & { mode: InContextMode }) {
  if (mode === 'none') return null
  return (
    <div className="mt-4 flex w-full justify-center rounded-lg bg-surface-100 p-4">
      {mode === 'twitter' && <TwitterCardMockup {...rest} />}
      {mode === 'linkedin' && <LinkedInCardMockup {...rest} />}
      {mode === 'blog' && <BlogListingMockup {...rest} />}
    </div>
  )
}
