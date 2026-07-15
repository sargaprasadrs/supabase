export function getAssetPrefix() {
  // If not force enabled, but not production env, disable CDN
  if (process.env.FORCE_ASSET_CDN !== '1' && process.env.VERCEL_ENV !== 'production') {
    return undefined
  }

  // Force disable CDN
  if (process.env.FORCE_ASSET_CDN === '-1') {
    return undefined
  }

  const SUPABASE_ASSETS_URL =
    process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging'
      ? 'https://frontend-assets.supabase.green'
      : 'https://frontend-assets.supabase.com'

  return `${SUPABASE_ASSETS_URL}/${process.env.SITE_NAME}/${process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 12) ?? 'unknown'}`
}
