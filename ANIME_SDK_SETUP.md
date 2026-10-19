# KitsuNest anime-sdk catalogue backend

Anime-SDK attribution: [Anime-SDK](https://anime-sdk.hexxt.dev/). Keep this attribution and any provider-required links visible where applicable.

This small Node.js 20+ service uses the `anime-sdk` metadata layer (AniList) to search anime and import catalogue information plus external viewing links when AniList supplies them. It does not currently instantiate Anime-SDK content providers or resolve playable streams.

## Deploy

Deploy the `backend/` directory as a separate Node web service (for example, a Node service on Render). Set:

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Node version:** 20 or newer
- **ALLOWED_ORIGIN:** `https://killbo95.github.io`

The host should set `PORT` automatically. Once deployed, open the service's `/health` URL and confirm it returns `"ok": true`.

Then open KitsuNest Admin and use **Search anime-sdk**. The first time, paste the backend's HTTPS base URL; it is saved only in that browser's local storage.

## Endpoints

- `GET /health`
- `GET /api/catalogue/search?q=Haikyuu`
- `GET /api/catalogue/info?id=anilist:21`

This backend intentionally exposes catalogue metadata and external links supplied by the metadata catalogue. It does not currently call Anime-SDK content-provider resolvers, proxy video files, or host video. An external link may be unavailable, region-limited, or not embeddable; playback is controlled by the linked service. Before enabling any content provider's stream resolver, verify the applicable source permissions and API terms. Import only episode URLs you are authorized to publish or embed.
