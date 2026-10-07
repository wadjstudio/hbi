import { z } from "zod";

const itemId = z.string().regex(/^Q[1-9]\d*$/);
const localized = z.record(
  z.string(),
  z.object({ value: z.string().max(2000) }),
);
const statement = z.object({
  rank: z.enum(["normal", "preferred", "deprecated"]),
  mainsnak: z.object({
    snaktype: z.string(),
    datavalue: z.object({ value: z.unknown() }).optional(),
  }),
});
const entitySchema = z.object({
  id: itemId,
  lastrevid: z.number().int().positive(),
  labels: localized.default({}),
  descriptions: localized.default({}),
  claims: z.record(z.string(), z.array(statement)).default({}),
});
export type PlayerCandidate = {
  externalId: string;
  labelAr: string | null;
  labelEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  sourceUrl: string;
  revision: number;
  retrievedAt: string;
  license: "CC0-1.0";
  reviewStatus: "unreviewed";
};

function hasItem(
  entity: z.infer<typeof entitySchema>,
  property: string,
  id: string,
) {
  return (entity.claims[property] ?? []).some((claim) => {
    if (claim.rank === "deprecated" || claim.mainsnak.snaktype !== "value")
      return false;
    const parsed = z
      .object({ id: itemId })
      .safeParse(claim.mainsnak.datavalue?.value);
    return parsed.success && parsed.data.id === id;
  });
}

/** Names only. Deliberately excludes images, dates of birth, inferred teams and statistics. */
export function parsePlayerCandidates(
  raw: unknown,
  ids: string[],
  retrievedAt: string,
): PlayerCandidate[] {
  z.iso.datetime().parse(retrievedAt);
  z.array(itemId).max(6).parse(ids);
  const envelope = z
    .object({ entities: z.record(z.string(), z.unknown()) })
    .parse(raw);
  return [...new Set(ids)].flatMap((id) => {
    const result = entitySchema.safeParse(envelope.entities[id]);
    if (!result.success || result.data.id !== id) return [];
    const entity = result.data;
    // Direct, nondeprecated human + handball-player occupation claims, not a name/description guess.
    if (!hasItem(entity, "P31", "Q5") || !hasItem(entity, "P106", "Q12840545"))
      return [];
    if (!entity.labels.ar?.value && !entity.labels.en?.value) return [];
    return [
      {
        externalId: id,
        labelAr: entity.labels.ar?.value ?? null,
        labelEn: entity.labels.en?.value ?? null,
        descriptionAr: entity.descriptions.ar?.value ?? null,
        descriptionEn: entity.descriptions.en?.value ?? null,
        sourceUrl: `https://www.wikidata.org/w/index.php?title=${id}&oldid=${entity.lastrevid}`,
        revision: entity.lastrevid,
        retrievedAt,
        license: "CC0-1.0" as const,
        reviewStatus: "unreviewed" as const,
      },
    ];
  });
}

async function fetchJson(url: URL, signal: AbortSignal, fetcher: typeof fetch) {
  const response = await fetcher(url, {
    signal,
    credentials: "omit",
    // The Action API supports Api-User-Agent. Linked-data GETs use the browser's
    // normal User-Agent without a custom-header preflight on Special:EntityData.
    headers:
      url.pathname === "/w/api.php"
        ? {
            "Api-User-Agent": "SESEN/0.2 (https://github.com/wadjstudio/hbi)",
          }
        : undefined,
  });
  if (!response.ok)
    throw new Error(
      `Wikidata HTTP ${response.status}. Retry later; no data was imported.`,
    );
  const data: unknown = await response.json();
  const error = z
    .object({ error: z.object({ code: z.string() }) })
    .safeParse(data);
  if (error.success)
    throw new Error(`Wikidata ${error.data.error.code}. Retry later.`);
  return data;
}

async function request(
  params: Record<string, string>,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.search = new URLSearchParams({
    format: "json",
    origin: "*",
    maxlag: "5",
    ...params,
  }).toString();
  return fetchJson(url, signal, fetcher);
}

export async function searchHandballPlayers(
  query: string,
  language: "ar" | "en",
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const name = z.string().trim().min(2).max(100).parse(query);
  if (itemId.safeParse(name).success) {
    // Recommended linked-data access for a known item; no arbitrary URLs or proxy requests.
    const url = new URL(
      `https://www.wikidata.org/wiki/Special:EntityData/${name}.json`,
    );
    const data = await fetchJson(url, signal, fetcher);
    return parsePlayerCandidates(data, [name], new Date().toISOString());
  }
  const raw = await request(
    {
      action: "wbsearchentities",
      language,
      search: name,
      limit: "6",
      type: "item",
    },
    signal,
    fetcher,
  );
  const { search } = z
    .object({ search: z.array(z.object({ id: itemId })).max(6) })
    .parse(raw);
  const ids = [...new Set(search.map((item) => item.id))];
  if (!ids.length) return [];
  const entities = await request(
    {
      action: "wbgetentities",
      ids: ids.join("|"),
      props: "labels|descriptions|claims|info",
      languages: "ar|en",
    },
    signal,
    fetcher,
  );
  return parsePlayerCandidates(entities, ids, new Date().toISOString());
}

export function candidateExport(candidates: PlayerCandidate[]) {
  return JSON.stringify(
    {
      format: "sesen.external-player-candidates.v1",
      provider: "wikidata",
      reviewStatus: "unreviewed",
      candidates,
      warning:
        "Review identity and season separately. This is not a workspace backup, roster or event import.",
    },
    null,
    2,
  );
}
