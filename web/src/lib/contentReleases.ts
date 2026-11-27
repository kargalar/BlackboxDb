export interface ContentRelease {
  date: string;
  regionCode?: string | null;
}

export const releaseRegionCodes = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
  'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ ' +
  'TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ');

export const releaseAreaCodes = ['001', '021', '142', '150'];

export const releaseKey = ({ regionCode, date }: ContentRelease) => `${regionCode ?? ''}:${date}`;

function releaseSortDate(date: string) {
  return date.replace(/-Q([1-4])$/, (_, quarter: string) =>
    `-${String((Number(quarter) - 1) * 3 + 1).padStart(2, '0')}`
  );
}

export function mergeContentReleases(...groups: ContentRelease[][]) {
  const unique = new Map(groups.flat().map(({ date, regionCode }) => [
    releaseKey({ date, regionCode }),
    { date, regionCode: regionCode ?? null },
  ]));
  return [...unique.values()].sort(
    (a, b) => releaseSortDate(a.date).localeCompare(releaseSortDate(b.date))
      || a.date.localeCompare(b.date)
      || (a.regionCode ?? '').localeCompare(b.regionCode ?? '')
  );
}

export function isReleaseDate(value: string) {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?|-Q([1-4]))?$/.exec(value);
  if (!match || match[1] === '0000') return false;
  if (match[4]) return true;
  const day = `${match[1]}-${match[2] ?? '01'}-${match[3] ?? '01'}`;
  const parsed = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === day;
}

export function formatReleaseDate(value: string, locale: string, quarterLabel: (year: string, quarter: string) => string) {
  const [year, month, day] = value.split('-');
  if (month?.startsWith('Q')) return quarterLabel(year, month.slice(1));
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: month ? 'short' : undefined,
    day: day ? 'numeric' : undefined,
    timeZone: 'UTC',
  }).format(new Date(`${year}-${month ?? '01'}-${day ?? '01'}T00:00:00Z`));
}
