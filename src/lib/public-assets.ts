const assetCdnUrl = process.env.NEXT_PUBLIC_ASSET_CDN_URL?.replace(/\/+$/, "");

export function publicAsset(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return assetCdnUrl ? `${assetCdnUrl}${normalizedPath}` : normalizedPath;
}

export const HERO_VIDEO_POSTER_SRC = publicAsset("/videos/hero-poster.webp");
export const HERO_VIDEO_SRC = publicAsset("/videos/hero.mp4");
