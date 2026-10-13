import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const MOVIE_TYPE_ID = 1;
const dryRun = process.argv.includes("--dry-run");
const tmdbApiKey = process.env.TMDB_V3_API_KEY || process.env.TMDB_API_KEY;

type FilmMeta = {
  key: string;
  title: string;
  year: number;
  tmdbId?: number;
  posterPath?: string;
  backdropPath?: string;
};

type CitationSeed = {
  citingKey: string;
  citedKey: string;
  note: string;
  sourceUrl: string;
};

const targetFilms: Record<string, string> = {
  aboutDryGrasses: "1-1778365058362-mvyiim8vx",
  bestOfYouth: "1-1778367265008-o6568tfjo",
  naked: "1-1778367088136-kndbp0w2z",
  lilya: "1-1778366652279-48gccgmg1",
  irreversible: "1-1778364831117-0y76ad46v",
  aftersun: "1-1778355149035-uixifg8ad",
  everythingEverywhere: "1-1778353890210-c68aalftk",
  laHaine: "1-1778352880135-kzrq1oqob",
  departed: "1-1778380999445-65vtiv17q",
  royalTenenbaums: "1-1778379927790-rhgw2rvrq",
  radioheadInRainbows: "1-1778379401152-7o10s0ui6",
  goldenGlove: "1-1778378619179-j6474j8oh",
  hitTheRoad: "1-1778377876920-xyx3gnagx",
  anotherRound: "1-1778377685627-3bdloq39q",
  human: "1-1778374429859-cz4zifvl4",
  angelA: "1-1778368884295-c3anjfuao",
  intoTheWild: "1-1778368840442-6ecsvdp2h",
  iLostMyBody: "1-1778368815801-jbtgljrav",
  boyMoleFoxHorse: "1-1778368459866-x05ffrrjk",
  beforeSunset: "1-1778368187961-yw7t17wis",
  headOn: "1-1778368105591-b5vklw2k9",
  iSawTheSun: "1-1778368056998-41m6i04dy",
  tossUp: "1-1778368051879-p63jpkgjn",
  thouGildstTheEven: "1-1778367260041-gdot53jw0",
  shoplifters: "1-1778365327890-6w4ob8w7x",
  lifeIsBeautiful: "1-1778365277311-tsnr731dr",
  theThirdPage: "1-1778365214370-aqfwaj9g7",
  destiny: "1-1778365193484-r28ae0h30",
  wildPearTree: "1-1778365123449-89r50gzqw",
  onceAnatolia: "1-1778365106220-bm12tikeo",
  climax: "1-1778364356655-u70wnkh3d",
  t2Trainspotting: "1-1778363348348-uyitf561p",
  incendies: "1-1778363066264-9gl08nmt2",
  greenMile: "1-1778362299560-obqq6jyzy",
  cuckooNest: "1-1778361484228-wyoe26jyn",
  pianist: "1-1778361094285-qma8fnsqg",
  godfatherPart2: "1-1778360022187-4557z3tyh",
  leon: "1-1778360000148-5a2pz44up",
  babylon: "1-1778359502653-iv9jgi2a3",
  beforeSunrise: "1-1778359046862-pzdt2ja3n",
  requiem: "1-1778358720350-a39n497ee",
  holdovers: "1-1778358515565-l7pm5p9o8",
  memento: "1-1778357948481-vpv2w5gjo",
  noCountry: "1-1778357918659-ltlygsylf",
  truman: "1-1778355291862-62uguiv01",
  grandBudapest: "1-1778355003538-2xtv44trw",
  django: "1-1778354579680-zguwyke12",
  shutterIsland: "1-1778354544927-lvj06zkjo",
  matrix: "1-1778354376067-x8fzf5w59",
  taxiDriver: "1-1778354344758-0e9z2mr6y",
};

const externalFilms: Record<string, FilmMeta> = {
  rocco: { key: "rocco", title: "Rocco and His Brothers", year: 1960, tmdbId: 8422, posterPath: "/pngL8AraChIDOiWnKF2o3S9kJzJ.jpg", backdropPath: "/26LKQHOk5v7XjUFxm4Pv05nYgln.jpg" },
  julesAndJim: { key: "julesAndJim", title: "Jules and Jim", year: 1962, tmdbId: 1628, posterPath: "/kuFjZlcZhQFDtIjuI3GQJjsQG03.jpg", backdropPath: "/o3GSSYr7AzrdcukNpQrqFEJNOjk.jpg" },
  psycho: { key: "psycho", title: "Psycho", year: 1960, tmdbId: 539, posterPath: "/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg", backdropPath: "/mufF1aYvwdpKerhq5R1YrVcbJLY.jpg" },
  together: { key: "together", title: "Together", year: 2000, tmdbId: 742, posterPath: "/fIY5xko6dJOcn0hckudIhPXobve.jpg", backdropPath: "/8uszBImrPngs8G4Y21LHJVstNtC.jpg" },
  aHoleInMyHeart: { key: "aHoleInMyHeart", title: "A Hole in My Heart", year: 2005, tmdbId: 34614, posterPath: "/nT8SGitqWYH4pfWPiDiFBZTYY0o.jpg", backdropPath: "/lDZiR71OuK3CFX9hAK5DZjPIDuB.jpg" },
  theKilling: { key: "theKilling", title: "The Killing", year: 1956, tmdbId: 247, posterPath: "/A6VzUPcADZGYdGHlVdWvpMNDF5d.jpg", backdropPath: "/2EltoldCMsYmP2BXJVGiuNalEWv.jpg" },
  jasonAndTheArgonauts: { key: "jasonAndTheArgonauts", title: "Jason and the Argonauts", year: 1963, tmdbId: 11533, posterPath: "/xHVxIgqD5CxlOI5GHxvVSt5Zh5Y.jpg", backdropPath: "/xdefSJpYARFdW4jPhPsuvUlmt2M.jpg" },
  2001: { key: "2001", title: "2001: A Space Odyssey", year: 1968, tmdbId: 62, posterPath: "/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg", backdropPath: "/w5IDXtifKntw0ajv2co7jFlTQDM.jpg" },
  invocation: { key: "invocation", title: "Invocation of My Demon Brother", year: 1969, tmdbId: 42606, posterPath: "/hnJN9z43zIvQkqr7ydl6rxMTvuh.jpg", backdropPath: "/lHJ3bKaBMPKQQYYZhPf0Hdoae5i.jpg" },
  clockworkOrange: { key: "clockworkOrange", title: "A Clockwork Orange", year: 1971, tmdbId: 185, posterPath: "/4sHeTAp65WrSSuc05nRBKddhBxO.jpg", backdropPath: "/nLFxvLokHe3bQmrmAfljIfax2jQ.jpg" },
  codeUnknown: { key: "codeUnknown", title: "Code Unknown", year: 2000, tmdbId: 30970, posterPath: "/kJJx2FNmiaep8WT21uMPY9qPzxL.jpg", backdropPath: "/bTUBuFR25xvTiFel7q6pq0ejacY.jpg" },
  lastExit: { key: "lastExit", title: "Last Exit", year: 2003, tmdbId: 273807, posterPath: "/vX5xMlI4vEya2lqA5e4JWDUKNh7.jpg", backdropPath: "/kMDrYFTsic0qLDA7quOu7NUppB.jpg" },
  sisterMine: { key: "sisterMine", title: "Sister Mine", year: 2004 },
  laChambre: { key: "laChambre", title: "La chambre", year: 1972, tmdbId: 109383, posterPath: "/AcPjwocyAIqxkvjPOxAjWIbIDXH.jpg", backdropPath: "/OtUmiYLYgtHEL8Icg0mOjU61pQ.jpg" },
  hotelMonterey: { key: "hotelMonterey", title: "Hotel Monterey", year: 1973, tmdbId: 108831, posterPath: "/j7MhnnCY3eK9SquOAEjJLKlSLDe.jpg", backdropPath: "/rddoisVKDGQQ2kQYDVuNbZJJR4e.jpg" },
  morvernCallar: { key: "morvernCallar", title: "Morvern Callar", year: 2002, tmdbId: 18602, posterPath: "/kKGUF97v8a62MtSKM0V6fqDxGTS.jpg", backdropPath: "/aRFsgk8X8J6mRvgStvUDBIaDdlX.jpg" },
  paperMoon: { key: "paperMoon", title: "Paper Moon", year: 1973, tmdbId: 11293, posterPath: "/3GHG0kTcBWHKdXjj3RdK8GjBCd6.jpg", backdropPath: "/2Cf8V0iQx0c52IxeLdxOvjI2bBf.jpg" },
  aliceInTheCities: { key: "aliceInTheCities", title: "Alice in the Cities", year: 1974, tmdbId: 2204, posterPath: "/lw22wORmENkTZHGXI6bKmAIHxjO.jpg", backdropPath: "/gDibTI8sDBhFnczL3VqHhlnfq78.jpg" },
  tomboy: { key: "tomboy", title: "Tomboy", year: 2011, tmdbId: 65229, posterPath: "/plEV1Q5u5caYASlG3pq3ON7acN7.jpg", backdropPath: "/vP4LyCUQIuuLRGhfr0Xt88BNHE6.jpg" },
  matrix: { key: "matrix", title: "The Matrix", year: 1999, tmdbId: 603, posterPath: "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg", backdropPath: "/tlm8UkiQsitc8rSuIAscQDCnP8d.jpg" },
  fightClub: { key: "fightClub", title: "Fight Club", year: 1999, tmdbId: 550, posterPath: "/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg", backdropPath: "/c6OLXfKAk5BKeR6broC8pYiCquX.jpg" },
  clanOfWhiteLotus: { key: "clanOfWhiteLotus", title: "Clan of the White Lotus", year: 1980, tmdbId: 41377, posterPath: "/pEzzzy3vzge65hdbKsTNFYcDdyO.jpg", backdropPath: "/u85pNHeAmas7UDfYGzl7j3mH8OO.jpg" },
  executionersFromShaolin: { key: "executionersFromShaolin", title: "Executioners from Shaolin", year: 1977, tmdbId: 22124, posterPath: "/9PJyuHP1nNDMyJDZMpZWpwEduSL.jpg", backdropPath: "/5VDexRf65D6a2mnyVGzFNUNiV0k.jpg" },
  killBill: { key: "killBill", title: "Kill Bill: Vol. 1", year: 2003, tmdbId: 24, posterPath: "/v7TaX8kXMXs5yFFGR41guUDNcnB.jpg", backdropPath: "/iffzIhuLAO38Po6sh1s6ZEVwlNL.jpg" },
  ratatouille: { key: "ratatouille", title: "Ratatouille", year: 2007, tmdbId: 2062, posterPath: "/t3vaWRPSf6WjDSamIkKDs1iQWna.jpg", backdropPath: "/jQ6Vuxe1CEPMXTF7d0fZgdIBY8U.jpg" },
  inTheMoodForLove: { key: "inTheMoodForLove", title: "In the Mood for Love", year: 2000, tmdbId: 843, posterPath: "/iYypPT4bhqXfq1b6EnmxvRt6b2Y.jpg", backdropPath: "/ffQFnAUm2Uu4RU0nijpjPRf9TBT.jpg" },
  taxiDriver: { key: "taxiDriver", title: "Taxi Driver", year: 1976, tmdbId: 103, posterPath: "/ekstpH614fwDX8DUln1a2Opz0N8.jpg", backdropPath: "/9uddYYTNcLWpzUkl5iw1RUYhLhY.jpg" },
  scarface1983: { key: "scarface1983", title: "Scarface", year: 1983, tmdbId: 111, posterPath: "/iQ5ztdjvteGeboxtmRdXEChJOHh.jpg", backdropPath: "/1qM2BYNE11Viby8ImC9LC00DgDr.jpg" },
  visitors: { key: "visitors", title: "The Visitors", year: 1993, tmdbId: 11687, posterPath: "/hPCq0buG5PaXgKjzT2ktjrjlpbj.jpg", backdropPath: "/t9N0AYD6j2d3dSPDdeOhhLmz1nb.jpg" },
  z: { key: "z", title: "Z", year: 1969, tmdbId: 2721, posterPath: "/dFAJyFNgvOv24f2RQyI9KDxjGr3.jpg", backdropPath: "/7AvbU0ei7Fz21jqBL4tlgSufnMp.jpg" },
  magnificentSeven: { key: "magnificentSeven", title: "The Magnificent Seven", year: 1960, tmdbId: 966, posterPath: "/e5ToxOyJwuZD4VOfI0qEn5uIjeJ.jpg", backdropPath: "/x0JQBBfK68gHm8rmyKk60bnnyw9.jpg" },
  gridlockd: { key: "gridlockd", title: "Gridlock'd", year: 1997, tmdbId: 12489, posterPath: "/jlOL8fLsG0tGBtkj9qzHgqcHPVV.jpg", backdropPath: "/jFT7mu2A1rM64JeFg2126zaIwO0.jpg" },
  assassins: { key: "assassins", title: "Assassin(s)", year: 1997, tmdbId: 34068, posterPath: "/cq6qzZTrBtMfGaoco5SMgOd4IlI.jpg", backdropPath: "/qaBFoqsOsDJueaHKM86AxAbB13V.jpg" },
  boogieNights: { key: "boogieNights", title: "Boogie Nights", year: 1997, tmdbId: 4995, posterPath: "/wnE24UPCPQsQnbBOu4zVE2qaDNm.jpg", backdropPath: "/ArpTzQZHWh4UVsgUvV6S7WjTq1n.jpg" },
  noBudgetStory: { key: "noBudgetStory", title: "No Budget Story", year: 1997, tmdbId: 47234, posterPath: "/6poE0wJisqRLbQMwi17tKm86d8g.jpg", backdropPath: "/bR9sjOGnu1AkRYOTTmvzUeOMonH.jpg" },
  lesKaira: { key: "lesKaira", title: "Porn in the Hood", year: 2012, tmdbId: 123229, posterPath: "/cUW7NUzXJbvsZyM0LAAo5ftgov6.jpg", backdropPath: "/uVulZOgJmNEqzdd1Q5I0OdNUkqo.jpg" },
  whatsUp: { key: "whatsUp", title: "What's Up?", year: 2004 },
  informer: { key: "informer", title: "The Informer", year: 1935, tmdbId: 43896, posterPath: "/gFsyHdVg93uPMZc64kCaCR3Y7Vn.jpg", backdropPath: "/a9KoSHzoT8PLWYoFDBgjDdp1Z78.jpg" },
  audition: { key: "audition", title: "Audition", year: 2000, tmdbId: 11075, posterPath: "/zwGaUMm0wAqi0wkO7LJDlwoA5LP.jpg", backdropPath: "/xmtmZc5aylqDMRKYlU8pmsgG0HF.jpg" },
  debbieDoesDallas: { key: "debbieDoesDallas", title: "Debbie Does Dallas: The Revenge", year: 2003 },
  publicEnemy: { key: "publicEnemy", title: "The Public Enemy", year: 1931, tmdbId: 17687, posterPath: "/vVxdaRMprQO2DM4AFyJ6C4qZSFO.jpg", backdropPath: "/oXLaGV0VOqQhXdUmQpm6KGsSpu1.jpg" },
  scarface1932: { key: "scarface1932", title: "Scarface", year: 1932, tmdbId: 877, posterPath: "/y4E5oRiHMTFkEB12IIcpbKbKzDW.jpg", backdropPath: "/bIv1kaxb7tsiZYPO27PHfVb5eSF.jpg" },
  goingMyWay: { key: "goingMyWay", title: "Going My Way", year: 1944, tmdbId: 17661, posterPath: "/838yNJnOk6iZj5YK1MoKiN2n1hw.jpg", backdropPath: "/jiGn1FXSQVfN2nhix0tQtmoGWcF.jpg" },
  thirdMan: { key: "thirdMan", title: "The Third Man", year: 1949, tmdbId: 1092, posterPath: "/rO2Fq0AZZx9obs52KJdx4mRE8p5.jpg", backdropPath: "/rLLhOCgAjuvlKmjUqVb7P1UAbUI.jpg" },
  infernalAffairs: { key: "infernalAffairs", title: "Infernal Affairs", year: 2002, tmdbId: 10775, posterPath: "/gix9thDBXfjJ8M7rYbihqbQGBcP.jpg", backdropPath: "/iiDGA97Kqt2dVU1deXQF06USBRu.jpg" },
  infernalAffairs2: { key: "infernalAffairs2", title: "Infernal Affairs II", year: 2003, tmdbId: 11647, posterPath: "/q9MCjc4CMXju59slJEzYEtr7F3W.jpg", backdropPath: "/j0bK5l5Wo4XvUUrKp1FckLvbse9.jpg" },
  infernalAffairs3: { key: "infernalAffairs3", title: "Infernal Affairs III", year: 2003, tmdbId: 14310, posterPath: "/kXTHj16K8Lr1EgwdzuzAB1j4Cy5.jpg", backdropPath: "/vsTHSW1j3FDx3JTsiIfPcuu9C6h.jpg" },
  hotFuzz: { key: "hotFuzz", title: "Hot Fuzz", year: 2007, tmdbId: 4638, posterPath: "/zPib4ukTSdXvHP9pxGkFCe34f3y.jpg", backdropPath: "/9rMSCFH9zhv1vILpEZQlUJs9iUm.jpg" },
  fireWithin: { key: "fireWithin", title: "The Fire Within", year: 1963, tmdbId: 2593, posterPath: "/9iHsReoh2VuHihDmNXgLXCi18rR.jpg", backdropPath: "/aHMsHOCPSVD4Mv5rLf5k4JetPAv.jpg" },
  lastDetail: { key: "lastDetail", title: "The Last Detail", year: 1973, tmdbId: 14886, posterPath: "/zQoNkO99qfaBjh5aoA0pKau1prp.jpg", backdropPath: "/kyDesXA3VEx74ua1ZGAoYmzvjCc.jpg" },
  witness: { key: "witness", title: "Witness", year: 1985, tmdbId: 9281, posterPath: "/kOymD1rChAMykmDVEzJpIh4OYS7.jpg", backdropPath: "/aDn3wL0ObbA5TCn5ZLri9xI2kUZ.jpg" },
  redShoes: { key: "redShoes", title: "The Red Shoes", year: 1948, tmdbId: 19542, posterPath: "/vPvpBWFWDvEXuQBkoYgA6A89GVp.jpg", backdropPath: "/cSbBSHHiy849SUhyTW6FX4Dbj43.jpg" },
  magnificentAmbersons: { key: "magnificentAmbersons", title: "The Magnificent Ambersons", year: 1942, tmdbId: 965, posterPath: "/g5EosvM0delNPkgBDGYYZvJl46n.jpg", backdropPath: "/pkD7zVlHpBoORTtupteZxiOxaG4.jpg" },
  itsWonderfulLife: { key: "itsWonderfulLife", title: "It's a Wonderful Life", year: 1946, tmdbId: 1585 },
  wakingLife: { key: "wakingLife", title: "Waking Life", year: 2001 },
  casablanca: { key: "casablanca", title: "Casablanca", year: 1942, tmdbId: 289 },
  trust: { key: "trust", title: "Trust", year: 1990, tmdbId: 37291 },
  likeFatherLikeSon: { key: "likeFatherLikeSon", title: "Like Father, Like Son", year: 2013 },
  nobodyKnows: { key: "nobodyKnows", title: "Nobody Knows", year: 2004, tmdbId: 2517 },
  greatDictator: { key: "greatDictator", title: "The Great Dictator", year: 1940, tmdbId: 914 },
  onceUponATimeInTheWest: { key: "onceUponATimeInTheWest", title: "Once Upon a Time in the West", year: 1968, tmdbId: 335 },
  suspiria: { key: "suspiria", title: "Suspiria", year: 1977, tmdbId: 11906 },
  blackSwan: { key: "blackSwan", title: "Black Swan", year: 2010, tmdbId: 44214 },
  trainspotting: { key: "trainspotting", title: "Trainspotting", year: 1996, tmdbId: 627 },
  godfather: { key: "godfather", title: "The Godfather", year: 1972, tmdbId: 238 },
  nikita: { key: "nikita", title: "Nikita", year: 1990, tmdbId: 9322 },
  singinInTheRain: { key: "singinInTheRain", title: "Singin' in the Rain", year: 1952, tmdbId: 872 },
  theArtist: { key: "theArtist", title: "The Artist", year: 2011, tmdbId: 74643 },
  pi: { key: "pi", title: "Pi", year: 1998, tmdbId: 473 },
  merlusse: { key: "merlusse", title: "Merlusse", year: 1935 },
  theSilence: { key: "theSilence", title: "The Silence", year: 1963, tmdbId: 11506 },
  toBeOrNotToBe: { key: "toBeOrNotToBe", title: "To Be or Not to Be", year: 1942, tmdbId: 198 },
  shopAroundTheCorner: { key: "shopAroundTheCorner", title: "The Shop Around the Corner", year: 1940, tmdbId: 20334 },
  django1966: { key: "django1966", title: "Django", year: 1966 },
  greatSilence: { key: "greatSilence", title: "The Great Silence", year: 1968 },
  mandingo: { key: "mandingo", title: "Mandingo", year: 1975 },
  laura: { key: "laura", title: "Laura", year: 1944, tmdbId: 1939 },
  rosemaryBaby: { key: "rosemaryBaby", title: "Rosemary's Baby", year: 1968, tmdbId: 805 },
  ghostInTheShell: { key: "ghostInTheShell", title: "Ghost in the Shell", year: 1995, tmdbId: 9323 },
  darkCity: { key: "darkCity", title: "Dark City", year: 1998, tmdbId: 2666 },
  searchers: { key: "searchers", title: "The Searchers", year: 1956, tmdbId: 3114 },
};

const sourceUrls = {
  bestOfYouth: "https://www.europeanfilmawards.eu/efa-movie/the-best-of-youth/",
  lilyaConnections: "https://www.imdb.com/title/tt0300140/movieconnections/",
  holeInMyHeart: "https://en.wikipedia.org/wiki/A_Hole_in_My_Heart",
  irreversibleConnections: "https://www.imdb.com/title/tt0290673/movieconnections/",
  codeUnknownConnections: "https://www.imdb.com/title/tt0216625/movieconnections/",
  aftersunFlicks: "https://www.flicks.com.au/features/the-director-of-aftersun-chats-with-us-about-her-exceptional-oscar-nominated-debut/",
  aftersunFarOut: "https://faroutmagazine.co.uk/chantal-akerman-inspired-devastating-end-aftersun/",
  eeaaoVanityFair: "https://www.vanityfair.com/hollywood/2022/04/everything-everywhere-all-at-once-explained",
  laHaineAlloCine: "https://www.allocine.fr/article/fichearticle_gen_carticle%3D18691573.html",
  laHaineConnections: "https://www.imdb.com/title/tt0113247/movieconnections/",
  assassins: "https://www.imdb.com/title/tt0118644/",
  gridlockd: "https://www.imdb.com/title/tt0119225/movieconnections/",
  lesKaira: "https://fr.wikipedia.org/wiki/Les_Ka%C3%AFra",
  whatsUp: "https://www.rottentomatoes.com/m/whats_up_2004",
  departedConnections: "https://www.imdb.com/title/tt0407887/movieconnections/",
  departedWiki: "https://en.wikipedia.org/wiki/The_Departed",
  departedEbert: "https://www.rogerebert.com/reviews/the-departed-2007",
  royalFaq: "https://www.imdb.com/title/tt0265666/faq/",
  royalReferences: "https://www.rushmoreacademy.com/academy/films/tenenbaums/library/references.html",
  angelAReview: "https://www.independent.co.uk/arts-entertainment/films/reviews/angela-15-409921.html",
  beforeSunsetConnections: "https://www.imdb.com/title/tt0381681/movieconnections/",
  shopliftersPressKit: "https://assets.ctfassets.net/22n7d68fswlw/4roPnNnMLSoEmAG0kMicga/000252dd885527fcb98fba3aad7dba94/shoplifters_presskit.pdf",
  lifeBeautifulConnections: "https://www.imdb.com/title/tt0118799/movieconnections/",
  onceAnatoliaWiki: "https://en.wikipedia.org/wiki/Once_Upon_a_Time_in_Anatolia",
  climaxEbert: "https://www.rogerebert.com/interviews/gaspar-noe-on-climax-accidental-allegories-catastrophe-movies-and-more",
  t2Connections: "https://www.imdb.com/title/tt2763304/movieconnections/",
  godfatherPart2Wiki: "https://en.wikipedia.org/wiki/The_Godfather_Part_II",
  leonWiki: "https://en.wikipedia.org/wiki/L%C3%A9on%3A_The_Professional",
  babylonWiki: "https://en.wikipedia.org/wiki/Babylon_(2022_film)",
  requiemWiki: "https://en.wikipedia.org/wiki/Requiem_for_a_Dream",
  holdoversInterview: "https://filmmakermagazine.com/122976-interview-alexander-payne-the-holdovers/",
  grandBudapestReferences: "https://www.dwell.com/article/behind-the-scenes-grand-budapest-hotel-65ab4652",
  djangoReferences: "https://the-take.com/watch/how-does-adjango-unchaineda-pay-homage-to-other-westerns",
  shutterIslandWiki: "https://en.wikipedia.org/wiki/Shutter_Island_(film)",
  matrixWiki: "https://en.wikipedia.org/wiki/The_Matrix",
  taxiDriverBfi: "https://www.bfi.org.uk/features/taxi-driver-5-films-that-influenced-scorseses-masterpiece",
};

const citations: CitationSeed[] = [
  { citingKey: "bestOfYouth", citedKey: "rocco", note: "On New Year's Eve, Matteo's return home deliberately echoes a similar scene in Luchino Visconti's Rocco and His Brothers.", sourceUrl: sourceUrls.bestOfYouth },
  { citingKey: "bestOfYouth", citedKey: "julesAndJim", note: "Nicola's line, 'he loves the idea of being in love,' is taken from Jules and Jim; the director also used the film's main theme.", sourceUrl: sourceUrls.bestOfYouth },
  { citingKey: "lilya", citedKey: "psycho", note: "After Lilja is raped, her posture against the shower wall and the torn shower curtain are clear visual references to Janet Leigh's scene in Psycho.", sourceUrl: sourceUrls.lilyaConnections },
  { citingKey: "lilya", citedKey: "together", note: "The ball game at the end is listed as a connection to the ball-game scene in Lukas Moodysson's Together.", sourceUrl: sourceUrls.lilyaConnections },
  { citingKey: "aHoleInMyHeart", citedKey: "lilya", note: "A Hole in My Heart consciously continues the thematic and formal influence of Lilya 4-ever; the connection is also signposted by dialogue directly referring to Lilya 4-ever.", sourceUrl: sourceUrls.holeInMyHeart },
  { citingKey: "irreversible", citedKey: "theKilling", note: "The Killing poster is visible in the apartment décor; this is a verifiable in-film poster reference.", sourceUrl: sourceUrls.irreversibleConnections },
  { citingKey: "irreversible", citedKey: "jasonAndTheArgonauts", note: "The Jason and the Argonauts poster appears above the bathroom toilet; it is a direct décor reference.", sourceUrl: sourceUrls.irreversibleConnections },
  { citingKey: "irreversible", citedKey: "2001", note: "A 2001: A Space Odyssey poster appears in Alex's bedroom; it is one of the film's clearest Kubrick references.", sourceUrl: sourceUrls.irreversibleConnections },
  { citingKey: "irreversible", citedKey: "invocation", note: "The drone-like music heard during the Rectum scene is listed as a reference because of its similarity to the sound world of Invocation of My Demon Brother.", sourceUrl: sourceUrls.irreversibleConnections },
  { citingKey: "irreversible", citedKey: "clockworkOrange", note: "The film openly echoes A Clockwork Orange through its presentation of violence and other Kubrick-related influences.", sourceUrl: sourceUrls.irreversibleConnections },
  { citingKey: "irreversible", citedKey: "codeUnknown", note: "The connection with Code Unknown is structural rather than a shot-for-shot quotation, involving the reverse ordering of events; it is not a director-confirmed scene reference.", sourceUrl: sourceUrls.codeUnknownConnections },
  { citingKey: "lastExit", citedKey: "irreversible", note: "IMDb Connections describes Last Exit's night scenes as being stylistically very similar to Irreversible. This is a formal similarity, not a confirmed homage.", sourceUrl: sourceUrls.irreversibleConnections },
  { citingKey: "sisterMine", citedKey: "irreversible", note: "The S&M club sequence in Sister Mine is listed as referring to the opening of Irreversible; the source provides no additional director confirmation.", sourceUrl: sourceUrls.irreversibleConnections },
  { citingKey: "aftersun", citedKey: "laChambre", note: "Charlotte Wells explicitly said that the final 360-degree turn was inspired by Chantal Akerman's La chambre.", sourceUrl: sourceUrls.aftersunFlicks },
  { citingKey: "aftersun", citedKey: "hotelMonterey", note: "The tracking idea in the hotel corridor is associated with Hotel Monterey as a formal influence identified by the director.", sourceUrl: sourceUrls.aftersunFarOut },
  { citingKey: "aftersun", citedKey: "morvernCallar", note: "Morvern Callar was used as a reference for the nightclub scenes.", sourceUrl: sourceUrls.aftersunFlicks },
  { citingKey: "aftersun", citedKey: "paperMoon", note: "Paper Moon was one of the main references behind the roadside tai chi scene.", sourceUrl: sourceUrls.aftersunFlicks },
  { citingKey: "aftersun", citedKey: "aliceInTheCities", note: "Alice in the Cities was cited among the formal references for the father-daughter journey and travel atmosphere.", sourceUrl: sourceUrls.aftersunFlicks },
  { citingKey: "aftersun", citedKey: "tomboy", note: "Tomboy was cited as a reference for details such as the child's age and sharing a beer with her father.", sourceUrl: sourceUrls.aftersunFlicks },
  { citingKey: "everythingEverywhere", citedKey: "matrix", note: "Daniels said the film might not exist without The Matrix; the Evelyn/Neo parallels and chosen-one narrative reflect this direct influence.", sourceUrl: sourceUrls.eeaaoVanityFair },
  { citingKey: "everythingEverywhere", citedKey: "fightClub", note: "Daniels watched The Matrix and Fight Club as a double feature; this is reported as a creative influence rather than a single-frame quotation.", sourceUrl: sourceUrls.eeaaoVanityFair },
  { citingKey: "everythingEverywhere", citedKey: "clanOfWhiteLotus", note: "The kung fu classic Clan of the White Lotus is one of the sources for the white-bearded master and the film's martial-arts references.", sourceUrl: sourceUrls.eeaaoVanityFair },
  { citingKey: "everythingEverywhere", citedKey: "executionersFromShaolin", note: "Executioners from Shaolin is referenced in connection with the white-bearded kung fu master and 1970s/80s martial-arts cinema.", sourceUrl: sourceUrls.eeaaoVanityFair },
  { citingKey: "everythingEverywhere", citedKey: "killBill", note: "The white-bearded master sequences also deliberately echo Kill Bill's Pai Mei flashbacks.", sourceUrl: sourceUrls.eeaaoVanityFair },
  { citingKey: "everythingEverywhere", citedKey: "2001", note: "The rock universe reworks the monolith image from the opening of 2001: A Space Odyssey as a comic visual riff.", sourceUrl: sourceUrls.eeaaoVanityFair },
  { citingKey: "everythingEverywhere", citedKey: "ratatouille", note: "The Racacoonie universe directly parodies Ratatouille by replacing the chef's helper with a raccoon.", sourceUrl: sourceUrls.eeaaoVanityFair },
  { citingKey: "everythingEverywhere", citedKey: "inTheMoodForLove", note: "The corridor and romantic atmosphere surrounding movie-star Evelyn and Waymond is an elaborate stylistic homage to In the Mood for Love.", sourceUrl: sourceUrls.eeaaoVanityFair },
  { citingKey: "laHaine", citedKey: "taxiDriver", note: "Vincent's mirror monologue is an explicit reference to Travis Bickle's mirror scene in Taxi Driver.", sourceUrl: sourceUrls.laHaineAlloCine },
  { citingKey: "laHaine", citedKey: "scarface1983", note: "The 'Le Monde est à vous' billboard recreates the 'The World is yours' image from Scarface.", sourceUrl: sourceUrls.laHaineAlloCine },
  { citingKey: "laHaine", citedKey: "visitors", note: "The nickname Cousin Hub is explained as a wink to Les Visiteurs, also known as The Visitors.", sourceUrl: sourceUrls.laHaineAlloCine },
  { citingKey: "laHaine", citedKey: "z", note: "Mathieu Kassovitz said he had Z in mind while writing La Haine; this is a political and cinematic influence rather than a scene quotation.", sourceUrl: sourceUrls.laHaineAlloCine },
  { citingKey: "laHaine", citedKey: "magnificentSeven", note: "The story about the falling man who says 'so far, so good' is an explicit popular-culture reference to The Magnificent Seven.", sourceUrl: sourceUrls.laHaineConnections },
  { citingKey: "gridlockd", citedKey: "laHaine", note: "Gridlock'd is listed among films that reference La Haine; the source summary does not identify a specific shot.", sourceUrl: sourceUrls.gridlockd },
  { citingKey: "assassins", citedKey: "laHaine", note: "Assassin(s) briefly reuses the 'Le Monde est à vous' advertisement from La Haine; both films were directed by Mathieu Kassovitz.", sourceUrl: sourceUrls.assassins },
  { citingKey: "boogieNights", citedKey: "laHaine", note: "Boogie Nights is listed among films that reference La Haine; the source summary does not provide a specific scene detail.", sourceUrl: sourceUrls.laHaineConnections },
  { citingKey: "noBudgetStory", citedKey: "laHaine", note: "A La Haine poster can be seen in No Budget Story; this is a décor/poster reference.", sourceUrl: sourceUrls.laHaineConnections },
  { citingKey: "lesKaira", citedKey: "laHaine", note: "The mirror scene in Porn in the Hood (Les Kaïra) recreates La Haine; the bus-stop scene also recalls La Haine, and a poster is visible.", sourceUrl: sourceUrls.lesKaira },
  { citingKey: "whatsUp", citedKey: "laHaine", note: "What's Up? is recorded as a remake that adapts La Haine to the reality of Rio.", sourceUrl: sourceUrls.whatsUp },
  { citingKey: "departed", citedKey: "informer", note: "The Informer is one of the films shown on a television inside The Departed.", sourceUrl: sourceUrls.departedConnections },
  { citingKey: "departed", citedKey: "audition", note: "Audition is playing on the television in Damon's apartment.", sourceUrl: sourceUrls.departedConnections },
  { citingKey: "departed", citedKey: "debbieDoesDallas", note: "Debbie Does Dallas: The Revenge is the film shown in the porno theater; no matching TMDB record was found for this title.", sourceUrl: sourceUrls.departedConnections },
  { citingKey: "departed", citedKey: "publicEnemy", note: "The killing of Putty Nose in The Public Enemy is used as one of the visual templates for a similar scene in The Departed.", sourceUrl: sourceUrls.departedConnections },
  { citingKey: "departed", citedKey: "scarface1932", note: "The X motif appearing around the deaths is a tribute to the same visual motif in Scarface (1932).", sourceUrl: sourceUrls.departedWiki },
  { citingKey: "departed", citedKey: "goingMyWay", note: "A dialogue and in-film quotation connection to Going My Way is listed in IMDb Connections.", sourceUrl: sourceUrls.departedConnections },
  { citingKey: "departed", citedKey: "thirdMan", note: "Billy's funeral recalls the visual arrangement of Harry Lime's funeral in The Third Man.", sourceUrl: sourceUrls.departedWiki },
  { citingKey: "departed", citedKey: "psycho", note: "The shower scene in The Departed deliberately echoes the shot composition and editing language of Psycho's shower murder sequence.", sourceUrl: sourceUrls.departedConnections },
  { citingKey: "infernalAffairs", citedKey: "departed", note: "The Departed is a remake of Infernal Affairs; the two sequels are also connected to the same trilogy.", sourceUrl: sourceUrls.departedEbert },
  { citingKey: "infernalAffairs2", citedKey: "departed", note: "The second film in the Infernal Affairs trilogy that The Departed remakes; this is a remake/adaptation relationship rather than a one-to-one scene reference.", sourceUrl: sourceUrls.departedConnections },
  { citingKey: "infernalAffairs3", citedKey: "departed", note: "The third film in the Infernal Affairs trilogy that The Departed remakes; this is a remake/adaptation relationship.", sourceUrl: sourceUrls.departedConnections },
  { citingKey: "hotFuzz", citedKey: "departed", note: "A shot in Hot Fuzz is listed as being very similar in its filming style to a scene in The Departed; this is a formal similarity rather than a direct quotation.", sourceUrl: sourceUrls.departedConnections },
  { citingKey: "royalTenenbaums", citedKey: "fireWithin", note: "The line 'I am going to kill myself tomorrow' was taken from The Fire Within, according to the director's commentary.", sourceUrl: sourceUrls.royalFaq },
  { citingKey: "royalTenenbaums", citedKey: "lastDetail", note: "The line 'Let's shag ass' is a verbal reference taken from The Last Detail.", sourceUrl: sourceUrls.royalFaq },
  { citingKey: "royalTenenbaums", citedKey: "witness", note: "A line and confrontation moment is borrowed from the Harrison Ford–Danny Glover scene in Witness.", sourceUrl: sourceUrls.royalReferences },
  { citingKey: "royalTenenbaums", citedKey: "redShoes", note: "The Red Shoes is cited among the Powell & Pressburger references influencing the color and staging of the title sequence.", sourceUrl: sourceUrls.royalReferences },
  { citingKey: "royalTenenbaums", citedKey: "magnificentAmbersons", note: "The Magnificent Ambersons is cited as a cinematic influence on the family-saga narrative; this is a directorial influence rather than a copied scene.", sourceUrl: sourceUrls.royalReferences },
  { citingKey: "angelA", citedKey: "itsWonderfulLife", note: "The angel who helps a suicidal man is a clear story-level echo of It's a Wonderful Life, as noted in contemporary criticism.", sourceUrl: sourceUrls.angelAReview },
  { citingKey: "beforeSunset", citedKey: "beforeSunrise", note: "Before Sunset uses visual flashbacks to Before Sunrise and continues the same characters' story nine years later.", sourceUrl: sourceUrls.beforeSunsetConnections },
  { citingKey: "beforeSunset", citedKey: "casablanca", note: "The Paris boat sequence echoes the boat imagery associated with Rick and Ilsa in Casablanca.", sourceUrl: sourceUrls.beforeSunsetConnections },
  { citingKey: "beforeSunset", citedKey: "trust", note: "Celine's line about love being more than respect, admiration, and trust is a direct verbal reference to Trust.", sourceUrl: sourceUrls.beforeSunsetConnections },
  { citingKey: "beforeSunset", citedKey: "wakingLife", note: "The film's conversation acknowledges that Jesse and Celine also appear together in Waking Life, extending their cinematic relationship beyond the Before films.", sourceUrl: sourceUrls.beforeSunsetConnections },
  { citingKey: "wakingLife", citedKey: "beforeSunrise", note: "Waking Life brings Jesse and Celine back as animated versions of their Before Sunrise characters for a new philosophical conversation.", sourceUrl: sourceUrls.beforeSunsetConnections },
  { citingKey: "shoplifters", citedKey: "likeFatherLikeSon", note: "Kore-eda developed Shoplifters while returning to the family question he explored in Like Father, Like Son.", sourceUrl: sourceUrls.shopliftersPressKit },
  { citingKey: "shoplifters", citedKey: "nobodyKnows", note: "Kore-eda described Shoplifters' wider social viewpoint as being in the vein of Nobody Knows.", sourceUrl: sourceUrls.shopliftersPressKit },
  { citingKey: "lifeIsBeautiful", citedKey: "greatDictator", note: "The Great Dictator is listed as a film connection to Life Is Beautiful; the parallel is clearest in the use of comedy against fascism and war.", sourceUrl: sourceUrls.lifeBeautifulConnections },
  { citingKey: "onceAnatolia", citedKey: "onceUponATimeInTheWest", note: "The English title Once Upon a Time in Anatolia deliberately references Sergio Leone's Once Upon a Time in the West.", sourceUrl: sourceUrls.onceAnatoliaWiki },
  { citingKey: "climax", citedKey: "suspiria", note: "The opening of Climax directly references Suspiria and places the dance-horror film in dialogue with Argento's classic.", sourceUrl: sourceUrls.climaxEbert },
  { citingKey: "climax", citedKey: "redShoes", note: "The Red Shoes is identified among the dance-film references surrounding Climax's choreographed descent into terror.", sourceUrl: sourceUrls.climaxEbert },
  { citingKey: "climax", citedKey: "blackSwan", note: "Black Swan is identified alongside Suspiria and The Red Shoes as part of Climax's dance-horror reference field.", sourceUrl: sourceUrls.climaxEbert },
  { citingKey: "t2Trainspotting", citedKey: "trainspotting", note: "T2 Trainspotting is a direct sequel that repeatedly brings back characters, dialogue, locations, and visual memories from Trainspotting.", sourceUrl: sourceUrls.t2Connections },
  { citingKey: "godfatherPart2", citedKey: "godfather", note: "The Godfather Part II continues Michael's story while replaying and expanding the family history established in The Godfather.", sourceUrl: sourceUrls.godfatherPart2Wiki },
  { citingKey: "leon", citedKey: "nikita", note: "Léon grew out of Luc Besson's earlier Nikita: Jean Reno's cleaner character Victor is the direct precursor to Léon.", sourceUrl: sourceUrls.leonWiki },
  { citingKey: "babylon", citedKey: "singinInTheRain", note: "Babylon repeatedly winks at Singin' in the Rain, using the same silent-to-sound transition as a darker and more chaotic counterpoint.", sourceUrl: sourceUrls.babylonWiki },
  { citingKey: "babylon", citedKey: "theArtist", note: "The Artist is referenced as a parallel film about Hollywood's transition from silent cinema to talkies.", sourceUrl: sourceUrls.babylonWiki },
  { citingKey: "requiem", citedKey: "pi", note: "Requiem for a Dream carries forward the compressed montage language Aronofsky established in his previous film Pi.", sourceUrl: sourceUrls.requiemWiki },
  { citingKey: "holdovers", citedKey: "merlusse", note: "Alexander Payne conceived The Holdovers after watching Marcel Pagnol's boarding-school film Merlusse.", sourceUrl: sourceUrls.holdoversInterview },
  { citingKey: "holdovers", citedKey: "lastDetail", note: "Payne identified Hal Ashby's The Last Detail as one of the key 1970s films used as a reference for The Holdovers' tone and period texture.", sourceUrl: sourceUrls.holdoversInterview },
  { citingKey: "grandBudapest", citedKey: "theSilence", note: "The circular door patterns and hotel interiors were designed with Ingmar Bergman's The Silence in mind.", sourceUrl: sourceUrls.grandBudapestReferences },
  { citingKey: "grandBudapest", citedKey: "toBeOrNotToBe", note: "Ernst Lubitsch's To Be or Not to Be was used as a reference for the mood of the hotel's interiors and comic staging.", sourceUrl: sourceUrls.grandBudapestReferences },
  { citingKey: "grandBudapest", citedKey: "shopAroundTheCorner", note: "The Shop Around the Corner is part of the Lubitsch tradition that Wes Anderson used to calibrate The Grand Budapest Hotel's European comedy.", sourceUrl: sourceUrls.grandBudapestReferences },
  { citingKey: "django", citedKey: "django1966", note: "Django Unchained takes its title and central western lineage from Sergio Corbucci's Django; Franco Nero's cameo makes the connection explicit.", sourceUrl: sourceUrls.djangoReferences },
  { citingKey: "django", citedKey: "greatSilence", note: "The snowy middle section of Django Unchained is a deliberate homage to Corbucci's The Great Silence.", sourceUrl: sourceUrls.djangoReferences },
  { citingKey: "django", citedKey: "mandingo", note: "The Mandingo fighting sequence is a direct genre reference to the 1975 film Mandingo.", sourceUrl: sourceUrls.djangoReferences },
  { citingKey: "shutterIsland", citedKey: "laura", note: "Scorsese identified Dana Andrews's character in Laura as the main cinematic reference for Teddy Daniels.", sourceUrl: sourceUrls.shutterIslandWiki },
  { citingKey: "matrix", citedKey: "ghostInTheShell", note: "The Wachowskis showed Ghost in the Shell to producer Joel Silver while pitching The Matrix; the anime's imagery and interface ideas carry into the film.", sourceUrl: sourceUrls.matrixWiki },
  { citingKey: "matrix", citedKey: "darkCity", note: "Dark City is one of the live-action science-fiction films most directly associated with The Matrix's reality-switching premise and visual design.", sourceUrl: sourceUrls.matrixWiki },
  { citingKey: "taxiDriver", citedKey: "searchers", note: "Taxi Driver pays clear homage to John Ford's The Searchers, especially in the story's search-and-rescue framework and Travis's framing.", sourceUrl: sourceUrls.taxiDriverBfi },
];

function tmdbImage(path?: string, width: "w500" | "w1280" = "w500") {
  return path ? `https://image.tmdb.org/t/p/${width}${path}` : undefined;
}

function fallbackId(meta: FilmMeta) {
  const slug = meta.title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return meta.tmdbId ? `citation-movie-tmdb-${meta.tmdbId}` : `citation-movie-${slug}-${meta.year}`;
}

function dateOnly(value?: string | null) {
  if (!value) return new Date(Date.UTC(1970, 0, 1));
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? new Date(Date.UTC(1970, 0, 1)) : date;
}

function normalizeTitle(value?: string | null) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function contentMatchesFilm(content: any, info: FilmMeta & { originalTitle?: string; releaseDate?: string }) {
  const expectedTitles = new Set([normalizeTitle(info.title), normalizeTitle(info.originalTitle)]);
  const actualTitles = [content.title, content.originalTitle].map((title) => normalizeTitle(title));
  return actualTitles.some((title) => title && expectedTitles.has(title));
}

async function fetchTmdbDetails(meta: FilmMeta) {
  if (!tmdbApiKey || !meta.tmdbId) return null;

  const url = new URL(`https://api.themoviedb.org/3/movie/${meta.tmdbId}`);
  url.searchParams.set("api_key", tmdbApiKey);
  url.searchParams.set("language", "en-US");

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TMDB ${response.status}`);
    return await response.json() as {
      title?: string;
      original_title?: string;
      release_date?: string;
      overview?: string;
      runtime?: number;
      poster_path?: string;
      backdrop_path?: string;
    };
  } catch (error) {
    console.warn(`Could not fetch TMDB details: ${meta.title}`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function main() {
  const allFilms = Object.values(externalFilms);
  const infos = new Map<string, FilmMeta & { originalTitle?: string; releaseDate?: string; description?: string; runtime?: number }>();

  for (const meta of allFilms) {
    const details = await fetchTmdbDetails(meta);
    infos.set(meta.key, {
      ...meta,
      title: details?.title || meta.title,
      originalTitle: details?.original_title || meta.title,
      releaseDate: details?.release_date || `${meta.year}-01-01`,
      description: details?.overview,
      runtime: details?.runtime || undefined,
      posterPath: details?.poster_path || meta.posterPath,
      backdropPath: details?.backdrop_path || meta.backdropPath,
    });
  }

  const externalTmdbIds = allFilms.flatMap((film) => film.tmdbId ? [film.tmdbId] : []);
  const existingExternal = await prisma.content.findMany({
    where: { contentTypeId: MOVIE_TYPE_ID, tmdbId: { in: externalTmdbIds } },
    include: { images: true },
  });
  const contentsByKey = new Map<string, any>();

  for (const [key, id] of Object.entries(targetFilms)) {
    const content = await prisma.content.findUnique({ where: { id }, include: { images: true } });
    if (!content) throw new Error(`Target film not found: ${key} (${id})`);
    contentsByKey.set(key, content);
  }

  for (const meta of allFilms) {
    const info = infos.get(meta.key)!;
    let content = existingExternal.find((item) => item.tmdbId === info.tmdbId && contentMatchesFilm(item, info));
    if (!content) {
      content = await prisma.content.findFirst({
        where: {
          contentTypeId: MOVIE_TYPE_ID,
          title: info.title,
          releaseDate: { gte: dateOnly(`${info.year}-01-01`), lt: dateOnly(`${info.year + 1}-01-01`) },
        },
        include: { images: true },
      });
    }

    if (!content) {
      const id = fallbackId(info);
      if (dryRun) {
        content = { id, title: info.title, images: [] };
        console.log(`[dry-run] content would be added: ${info.title} (${info.year})`);
      } else {
        content = await prisma.content.create({
          data: {
            id,
            title: info.title,
            originalTitle: info.originalTitle,
            tmdbId: info.tmdbId,
            contentTypeId: MOVIE_TYPE_ID,
            releaseDate: dateOnly(info.releaseDate),
            description: info.description,
            runtime: info.runtime,
          },
          include: { images: true },
        });
        console.log(`content added: ${info.title} (${info.year})`);
      }
    }

    if (!dryRun) {
      const imageUrls = [
        { type: "poster", url: tmdbImage(info.posterPath) },
        { type: "backdrop", url: tmdbImage(info.backdropPath, "w1280") },
      ];
      let posterImageId = content.posterImageId;
      let backdropImageId = content.backdropImageId;

      for (const image of imageUrls) {
        if (!image.url || content.images.some((item: any) => item.type === image.type)) continue;
        const created = await prisma.contentImage.create({ data: { contentId: content.id, type: image.type, filePath: image.url } });
        content.images.push(created);
        if (image.type === "poster") posterImageId = created.id;
        if (image.type === "backdrop") backdropImageId = created.id;
      }

      if (posterImageId !== content.posterImageId || backdropImageId !== content.backdropImageId) {
        content = await prisma.content.update({
          where: { id: content.id },
          data: { posterImageId, backdropImageId },
          include: { images: true },
        });
      }
    }
    contentsByKey.set(meta.key, content);
  }

  const createdCitations: string[] = [];
  for (const citation of citations) {
    const citing = contentsByKey.get(citation.citingKey);
    const cited = contentsByKey.get(citation.citedKey);
    if (!citing || !cited) throw new Error(`Citation content not found: ${citation.citingKey} -> ${citation.citedKey}`);

    const note = citation.note;

    if (dryRun) {
      console.log(`[dry-run] citation: ${citing.title} -> ${cited.title}`);
      continue;
    }

    await prisma.contentCitation.upsert({
      where: { citingContentId_citedContentId: { citingContentId: citing.id, citedContentId: cited.id } },
      update: { note, imageUrl: null },
      create: { citingContentId: citing.id, citedContentId: cited.id, note, imageUrl: null },
    });
    createdCitations.push(`${citing.title} -> ${cited.title}`);
  }

  console.log(`\n${dryRun ? "Dry run complete" : "Import complete"}.`);
  console.log(`Target films reviewed: ${Object.keys(targetFilms).length}`);
  console.log(`Citation candidates: ${citations.length}`);
  if (!dryRun) console.log(`Citations written/updated: ${createdCitations.length}`);
  const connectedTargetKeys = new Set(
    citations.flatMap((citation) => [citation.citingKey, citation.citedKey]),
  );
  const unconnectedTargets = Object.entries(targetFilms)
    .filter(([key]) => !connectedTargetKeys.has(key))
    .map(([key]) => contentsByKey.get(key)?.title || key);
  console.log(
    `Targets without an explicit, verifiable film-to-film citation: ${unconnectedTargets.join(", ") || "None"}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
