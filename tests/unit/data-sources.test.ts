import { describe, expect, it, vi } from "vitest";
import knownPlayer from "../fixtures/wikidata-known-player.json";
import {
  candidateExport,
  parsePlayerCandidates,
  searchHandballPlayers,
} from "../../features/data-sources/wikidata";
const statement = (id: string, rank = "normal") => ({
  rank,
  mainsnak: { snaktype: "value", datavalue: { value: { id } } },
});
const entity = {
  id: "Q18921300",
  lastrevid: 123,
  labels: { ar: { value: "اسم تجريبي" }, en: { value: "Test player" } },
  claims: { P31: [statement("Q5")], P106: [statement("Q12840545")] },
};
const fetched = "2026-10-08T00:00:00.000Z";
const envelope = (record: unknown = entity) => ({
  entities: { Q18921300: record },
});
describe("audited external player preview", () => {
  it("parses the minimal CC0 snapshot actually retrieved from the official endpoint", () => {
    expect(
      parsePlayerCandidates(knownPlayer, ["Q18921300"], fetched)[0],
    ).toMatchObject({
      labelAr: "أحمد الأحمر",
      labelEn: "Ahmed El-Ahmar",
      revision: 2554193793,
    });
  });
  it("keeps revision provenance and missing labels explicit; does not leak source artwork or claims", () => {
    const [row] = parsePlayerCandidates(
      envelope({
        ...entity,
        labels: { en: { value: "Test" } },
        images: ["unsafe"],
      }),
      [entity.id],
      fetched,
    );
    expect(row).toMatchObject({
      externalId: entity.id,
      labelAr: null,
      labelEn: "Test",
      retrievedAt: fetched,
      reviewStatus: "unreviewed",
      license: "CC0-1.0",
    });
    expect(row?.sourceUrl).toBe(
      "https://www.wikidata.org/w/index.php?title=Q18921300&oldid=123",
    );
    expect(row).not.toHaveProperty("images");
    expect(row).not.toHaveProperty("claims");
    expect(JSON.parse(candidateExport([row!])).format).toBe(
      "sesen.external-player-candidates.v1",
    );
  });
  it("excludes football namesakes, nonhumans, deprecated claims and identity mismatches", () => {
    for (const modified of [
      {
        ...entity,
        claims: { P31: [statement("Q5")], P106: [statement("Q937857")] },
      },
      {
        ...entity,
        claims: { P31: [statement("Q43229")], P106: entity.claims.P106 },
      },
      {
        ...entity,
        claims: {
          ...entity.claims,
          P106: [statement("Q12840545", "deprecated")],
        },
      },
      { ...entity, id: "Q123" },
      { id: entity.id, missing: "" },
    ])
      expect(
        parsePlayerCandidates(envelope(modified), [entity.id], fetched),
      ).toEqual([]);
  });
  it("only considers requested IDs and deduplicates them", () => {
    expect(
      parsePlayerCandidates(envelope(), [entity.id, entity.id], fetched),
    ).toHaveLength(1);
    expect(parsePlayerCandidates(envelope(), ["Q123"], fetched)).toEqual([]);
    expect(() =>
      parsePlayerCandidates(envelope(), ["../../secret"], fetched),
    ).toThrow();
  });
  it("uses two bounded credential-free GETs after explicit search with safe URL encoding", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ search: [{ id: entity.id }] })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope())));
    const signal = new AbortController().signal;
    const result = await searchHandballPlayers(
      "Ahmed & test",
      "en",
      signal,
      fetcher,
    );
    expect(result).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(new URL(String(url)).searchParams.get("search")).toBe(
      "Ahmed & test",
    );
    expect(new URL(String(url)).hostname).toBe("www.wikidata.org");
    expect(init).toMatchObject({ credentials: "omit", signal });
  });
  it("stops on provider throttling, API maxlag and malformed responses without an automatic retry", async () => {
    for (const response of [
      new Response("{}", { status: 429 }),
      new Response(JSON.stringify({ error: { code: "maxlag" } })),
      new Response(
        JSON.stringify({ search: [{ id: "https://foreign.test" }] }),
      ),
    ]) {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
      await expect(
        searchHandballPlayers(
          "Ahmed",
          "en",
          new AbortController().signal,
          fetcher,
        ),
      ).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
  it("avoids entity fetching on empty search and avoids network for invalid input", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"search":[]}'));
    await expect(
      searchHandballPlayers(
        "Unknown",
        "en",
        new AbortController().signal,
        fetcher,
      ),
    ).resolves.toEqual([]);
    await expect(
      searchHandballPlayers(" ", "ar", new AbortController().signal, fetcher),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("retrieves a known item through the linked-data endpoint in one bounded request", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(envelope())));
    await expect(
      searchHandballPlayers(
        entity.id,
        "ar",
        new AbortController().signal,
        fetcher,
      ),
    ).resolves.toHaveLength(1);
    expect(String(fetcher.mock.calls[0]![0])).toBe(
      "https://www.wikidata.org/wiki/Special:EntityData/Q18921300.json",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
