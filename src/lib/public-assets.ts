const assetCdnUrl = process.env.NEXT_PUBLIC_ASSET_CDN_URL?.replace(/\/+$/, "");
const heroAssetVersion = "20260624-1";
const brandAssetVersion = "20260509";

export function publicAsset(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return assetCdnUrl ? `${assetCdnUrl}${normalizedPath}` : normalizedPath;
}

// Hero media is served from the app origin because cdn.egadisailing.com may not have
// freshly deployed video assets yet, and cached CDN 404s hide both poster and video.
export const HERO_VIDEO_DESKTOP_POSTER_SRC = `/videos/hero3-desktop-poster.webp?v=${heroAssetVersion}`;
export const HERO_VIDEO_MOBILE_POSTER_SRC = `/videos/hero3-mobile-poster.webp?v=${heroAssetVersion}`;
export const HERO_VIDEO_SRC = `/videos/hero3desktop.mp4?v=${heroAssetVersion}`;
export const HERO_VIDEO_MOBILE_SRC = `/videos/hero3mobile.mp4?v=${heroAssetVersion}`;
export const BRAND_LOGO_SRC = `/images/brand/egadi-sailing-logo-white.svg?v=${brandAssetVersion}`;
export const BRAND_LOGO_EMAIL_WHITE_SRC = publicAsset(
  `/images/brand/egadi-sailing-logo-white.svg?v=${brandAssetVersion}`,
);
