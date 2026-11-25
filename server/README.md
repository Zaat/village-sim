# Ratings server (optional)

The game never needs this. It is a tiny Cloudflare Worker with a D1 database that tallies how players rate the generated music tracks, so the best tracks can be kept and the ones people skip can be replaced.

- Stores one row per track seed: likes, dislikes, skips, plays. Nothing about people: no IP address, no browser id, no user agent.
- The game sends only changes, and only if the player turned on "Share my ratings" in the music panel.
- `GET /top` returns the best 100 tracks as JSON.

## Deploy (once, from a terminal)

```
npm install -g wrangler
wrangler login
wrangler d1 create village-sim-ratings        # copy the database_id into wrangler.toml
wrangler d1 execute village-sim-ratings --remote --file=schema.sql
wrangler deploy
```

Then put the Worker address in `SND_ENDPOINT` at the top of `src/sound.js` (for example `https://village-sim-ratings.<account>.workers.dev/rate`). Add a rate limit rule in the Cloudflare dashboard (Security > WAF > Rate limiting) so one address cannot flood it; Cloudflare does that without our code seeing addresses.
