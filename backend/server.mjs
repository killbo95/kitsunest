import { createServer } from "node:http";
import { AnilistMeta, AllmangaProvider, HttpClient } from "anime-sdk";

const port = Number(process.env.PORT || 8788);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://killbo95.github.io";
const http = new HttpClient({ timeoutMs: 25000 });
const meta = new AnilistMeta(http);
const contentProvider = new AllmangaProvider(http);

function titleText(title) {
  if (typeof title === "string") return title;
  return title?.english || title?.userPreferred || title?.romaji || title?.native || "Untitled anime";
}
function posterUrl(cover) {
  if (typeof cover === "string") return cover;
  return cover?.extraLarge || cover?.large || cover?.medium || "";
}
function normalizeSearch(item) {
  return {
    id: item.id,
    title: titleText(item.title),
    poster: posterUrl(item.cover || item.coverImage || item.thumbnailUrl),
    year: item.year || item.seasonYear || item.startDate?.year || "",
    episodes: item.episodeCount || item.episodes || null,
    description: item.description || "",
    genres: item.genres || [],
    provider: "anilist"
  };
}
function normalizeInfo(item) {
  // AniList may supply direct episode-page links, but coverage varies by title.
  const streamingEpisodes = Array.isArray(item.streamingEpisodes) ? item.streamingEpisodes
    .map((ep, i) => {
      const externalUrl = typeof ep?.externalUrl === "string" ? ep.externalUrl
        : typeof ep?.url === "string" ? ep.url : "";
      if (!/^https:\/\//i.test(externalUrl)) return null;
      const title = ep.title || "";
      const match = title.match(/(?:episode|ep\.?|#)\s*(\d+)/i);
      return {
        number: Number(ep.number) || Number(match?.[1]) || i + 1,
        title: title || `Episode ${Number(ep.number) || i + 1}`,
        url: externalUrl,
        thumbnail: ep.thumbnail || ""
      };
    }).filter(Boolean) : [];
  const externalLinks = Array.isArray(item.externalLinks) ? item.externalLinks : [];
  const viewingLinks = externalLinks
    .filter(link => /^https:\/\//i.test(link?.url || "") && String(link?.type || "").toUpperCase() === "STREAMING")
    .map(link => ({ site: String(link.site || "Streaming service"), url: link.url }))
    .filter((link, index, all) => all.findIndex(other => other.url === link.url) === index);
  const official = externalLinks.find(link =>
    /^https:\/\//i.test(link?.url || "") &&
    (/official|website/i.test(String(link?.site || "")) || String(link?.type || "").toUpperCase() === "INFO")
  )?.url || "";
  return {
    id: item.id,
    title: titleText(item.title),
    poster: posterUrl(item.cover),
    year: item.year || item.startDate?.slice?.(0, 4) || "",
    episodes: Number(item.episodeCount) || streamingEpisodes.length || null,
    description: item.description || "",
    genres: item.genres || [],
    official,
    viewingLinks,
    streamingEpisodes
  };
}
function send(res, status, body, origin) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(body));
}
const server = createServer(async (req, res) => {
  const origin = req.headers.origin || allowedOrigin;
  if (origin !== allowedOrigin && origin !== "http://localhost:5500" && origin !== "http://127.0.0.1:5500") {
    return send(res, 403, { error: "Origin is not allowed." }, allowedOrigin);
  }
  if (req.method === "OPTIONS") return send(res, 204, {}, origin);
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  try {
    if (req.method !== "GET") return send(res, 405, { error: "Only GET is supported." }, origin);
    if (url.pathname === "/health") return send(res, 200, { ok: true, service: "KitsuNest anime-sdk catalogue", provider: "AniList", version: 1 }, origin);
    if (url.pathname === "/api/catalogue/search") {
      const q = (url.searchParams.get("q") || "").trim();
      if (q.length < 2 || q.length > 100) return send(res, 400, { error: "Search must be 2–100 characters." }, origin);
      const results = await meta.search(q);
      return send(res, 200, { results: (results || []).slice(0, 10).map(normalizeSearch) }, origin);
    }
    if (url.pathname === "/api/catalogue/episodes") {
      const id = url.searchParams.get("id") || "";
      if (!/^anilist:\d+$/.test(id)) return send(res, 400, { error: "A valid AniList ID is required." }, origin);
      const episodes = await meta.fetchContentUnits(id, contentProvider);
      return send(res, 200, {
        provider: contentProvider.id,
        episodes: (episodes || []).map(ep => ({
          id: ep.id,
          number: Number(ep.number),
          title: ep.title || \`Episode \${ep.number}\`,
          availableLanguages: ep.availableLanguages || [],
          thumbnail: ep.thumbnailUrl || "",
          isFiller: Boolean(ep.isFiller),
          isRecap: Boolean(ep.isRecap)
        })).filter(ep => Number.isFinite(ep.number) && ep.number > 0).sort((a, b) => a.number - b.number)
      }, origin);
    }
    if (url.pathname === "/api/catalogue/info") {
      const id = url.searchParams.get("id") || "";
      if (!/^anilist:\d+$/.test(id)) return send(res, 400, { error: "A valid AniList ID is required." }, origin);
      const item = await meta.fetchMediaInfo(id);
      return send(res, 200, { item: normalizeInfo(item) }, origin);
    }
    return send(res, 404, { error: "Route not found." }, origin);
  } catch (error) {
    console.error(error);
    return send(res, 502, { error: "Anime catalogue request failed. Please retry shortly." }, origin);
  }
});
server.listen(port, "0.0.0.0", () => console.log(`KitsuNest anime-sdk catalogue listening on ${port}`));
