export function updateExploreUrl(params: URLSearchParams, replace = false) {
  const { pathname, search, hash } = window.location;
  const query = params.toString();
  const nextSearch = query ? `?${query}` : '';
  if (search === nextSearch) return;

  const url = `${pathname}${nextSearch}${hash}`;
  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
}

export function getExplorePage(value: string | null, itemsPerPage: number): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  const maxPage = Math.floor(2_147_483_647 / itemsPerPage) + 1;
  return page >= 1 && page <= maxPage ? page : 1;
}
