export function igdbImageUrl(imageId: string, size: 'cover_small' | 'cover_big' | 'screenshot_med' | '720p' | '1080p' = 'cover_big') {
  // https://api-docs.igdb.com/#images
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}
