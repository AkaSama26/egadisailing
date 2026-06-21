const assetCdnUrl = process.env.NEXT_PUBLIC_ASSET_CDN_URL?.replace(/\/+$/, "");
const heroAssetVersion = "20260621-2";
const brandAssetVersion = "20260509";

export function publicAsset(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return assetCdnUrl ? `${assetCdnUrl}${normalizedPath}` : normalizedPath;
}

export const HERO_VIDEO_POSTER_SRC = publicAsset("/videos/hero2-poster.webp");
export const HERO_VIDEO_SRC = publicAsset(`/videos/hero2-desktop.mp4?v=${heroAssetVersion}`);
export const HERO_VIDEO_MOBILE_SRC = publicAsset(`/videos/hero2-mobile.mp4?v=${heroAssetVersion}`);
export const BRAND_LOGO_SRC = `/images/brand/egadi-sailing-logo-white.svg?v=${brandAssetVersion}`;
export const BRAND_LOGO_EMAIL_WHITE_SRC = publicAsset(
  `/images/brand/egadi-sailing-logo-white.svg?v=${brandAssetVersion}`,
);
