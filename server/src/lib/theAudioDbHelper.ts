export async function fetchTheAudioDbArtistInfo(artistName: string) {
  try {
    const url = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(artistName)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data: any = await response.json();
    if (!data.artists || data.artists.length === 0) return null;

    return data.artists[0];
  } catch (err) {
    console.error(`[TheAudioDB] Error fetching artist info for ${artistName}:`, err);
    return null;
  }
}

export async function fetchTheAudioDbAlbumInfo(artistName: string, albumName: string) {
  try {
    const url = `https://www.theaudiodb.com/api/v1/json/2/searchalbum.php?s=${encodeURIComponent(artistName)}&a=${encodeURIComponent(albumName)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data: any = await response.json();
    if (!data.album || data.album.length === 0) return null;

    return data.album[0];
  } catch (err) {
    console.error(`[TheAudioDB] Error fetching album info for ${artistName} - ${albumName}:`, err);
    return null;
  }
}
