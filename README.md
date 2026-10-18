# iWantACat-website

Website for [iwanta.cat](https://iwanta.cat) – find animal shelters near you and adopt a cat. 🐈

Search for a city, address or postcode, or share your location, and the site lists the nearest
animal shelters on a map with address, opening hours and contact details.

## How it works

- **Shelter data** comes from [OpenStreetMap](https://www.openstreetmap.org) (`amenity=animal_shelter`,
  including shelters mapped as areas). Sanctuaries and shelters that explicitly only take other
  animals (e.g. `animal_shelter=dog` or `horse`) are filtered out.
- The data is **prebuilt** by [`scripts/fetch-shelters.ts`](scripts/fetch-shelters.ts) into
  `public/data/shelters.json` during deployment and refreshed weekly. The nearest shelters are
  calculated in the browser, so the user's location never leaves the device.
- If the dataset can't be loaded, the site falls back to querying the
  [Overpass API](https://overpass-api.de) live.
- Place search uses [Nominatim](https://nominatim.org); map tiles come from OpenStreetMap.

Built with [Vite](https://vite.dev), TypeScript and [Leaflet](https://leafletjs.com) – no framework.

## Development

Requires Node.js 22.18 or newer (or use the dev container).

```sh
npm install
npm run data   # optional: download the shelter dataset (takes a few minutes)
npm run dev    # http://localhost:5173
```

Without `npm run data`, the dev server uses the live Overpass fallback.

| Command             | Description                                     |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Start the dev server with hot reload            |
| `npm test`          | Run unit tests (Vitest)                         |
| `npm run typecheck` | Type-check the project                          |
| `npm run build`     | Type-check and build the site into `dist/`      |
| `npm run preview`   | Serve the production build locally              |
| `npm run data`      | Download the shelter dataset from OpenStreetMap |

## Deployment

Pushing to `main` (and a weekly schedule) runs [`.github/workflows/pages.yml`](.github/workflows/pages.yml),
which tests, fetches fresh shelter data, builds and deploys to GitHub Pages. If Overpass is unavailable,
the previously published dataset is reused.

## Missing a shelter?

Add it to [OpenStreetMap](https://www.openstreetmap.org) with `amenity=animal_shelter` (and ideally
`animal_shelter=cat;dog`, `website`, `phone` and `opening_hours`). It will show up after the next weekly update.

## License

[MIT](LICENSE)
