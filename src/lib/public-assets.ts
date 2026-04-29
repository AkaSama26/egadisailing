const assetCdnUrl = process.env.NEXT_PUBLIC_ASSET_CDN_URL?.replace(/\/+$/, "");
const heroAssetVersion = "20260430";

export function publicAsset(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return assetCdnUrl ? `${assetCdnUrl}${normalizedPath}` : normalizedPath;
}

export const HERO_VIDEO_POSTER_SRC = publicAsset(`/videos/hero-poster.webp?v=${heroAssetVersion}`);
export const HERO_VIDEO_SRC = publicAsset(`/videos/hero.mp4?v=${heroAssetVersion}`);
