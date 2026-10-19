# KitsuNest anime-sdk catalogue backend

Anime-SDK attribution: [Anime-SDK](https://anime-sdk.hexxt.dev/). Keep this attribution and any provider-required links visible where applicable.

This Node.js 20+ service uses Anime-SDK metadata and content-provider APIs. The admin searches AniList metadata, fetches the provider episode list, and stores a KitsuNest player URL for each returned episode. The player route asks Anime-SDK to resolve a stream when opened.

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
- `GET /api/catalogue/episodes?id=anilist:21`
- `GET /api/catalogue/player?id=anilist:21&episode=1&language=sub`

The episode endpoint returns normalized episode metadata. The player endpoint resolves a stream on demand and renders a video player; upstream availability, required headers, and cross-origin restrictions may vary. Check the applicable provider permissions and terms before publishing a source.
