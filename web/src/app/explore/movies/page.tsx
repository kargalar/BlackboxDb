// Canonical movies explore sayfası /explore altındadır. Bu rota, tutarlılık için oraya yönlendirir.
import { redirect } from 'next/navigation';

export default function MoviesExploreRedirect({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // Var olan sorgu parametrelerini koruyarak /explore'a yönlendir
  const qs = new URLSearchParams();
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (Array.isArray(v)) {
        v.forEach((vv) => vv != null && qs.append(k, String(vv)));
      } else if (v != null) {
        qs.set(k, String(v));
      }
    }
  }
  const target = `/explore${qs.toString() ? `?${qs.toString()}` : ''}`;
  redirect(target);
}
