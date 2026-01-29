# Crime & Safety Dashboard (Rich Web Application)

## How to run locally

1. Install Node.js (LTS recommended)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Pull Vercel environment variables:
   ```bash
   npm run env:pull
   ```
4. Start the development server (CRA + Vercel dev, port 3002):
   ```bash
   npm run dev
   ```
5. Open: `http://localhost:3000`

Fallback (port 3001):
```bash
npm run dev:3001
```

### PowerShell note
PowerShell environment variables can persist between sessions. If you previously set `API_PORT`, use the scripts above to force a clean port mapping or run `Remove-Item Env:API_PORT -ErrorAction SilentlyContinue`.

### Local Dev: One-Command Checklist
1. `npm run env:pull`
2. `npm run dev`
3. `curl.exe http://localhost:3000/api/debug-env`
4. `curl.exe http://localhost:3000/api/health`
5. `curl.exe http://localhost:3000/api/editorialize-debug`
6. `curl.exe "http://localhost:3000/api/resolve-location?q=Manchester"`
7. Gemini smoke test:
   ```bash
   curl.exe -X POST http://localhost:3000/api/editorialize ^
     -H "Content-Type: application/json" ^
     -d "{\"useGemini\":true,\"location\":{\"name\":\"Manchester\",\"canonicalSlug\":\"manchester\"},\"crimeStats\":{\"monthLabel\":\"Latest\",\"incidentsThisMonth\":120,\"topCategory\":\"anti-social behaviour\",\"categoryShare\":24.5,\"threeMonthAverage\":135,\"trendCoverageMonths\":4},\"guardianHeadlines\":[],\"imageManifest\":[]}"
   ```
8. Open `/journal-admin` and generate 1 Manchester (Gemini on).

### Local env notes
- Serverless functions (Vercel dev) read `GEMINI_API_KEY`, `GUARDIAN_API_KEY`, `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY` from `.env.local`.
- Frontend uses `REACT_APP_*` variables only (no secrets).
- Debug env endpoint: `http://localhost:3001/api/debug-env`


### Location input modes 
You can type any of the following into the location box:
- **UK postcode** (example: `GL50 1AA`)
- **Place name** (example: `Cheltenham`)
- **Lat/Lng pair** (example: `51.8994,-2.0783`)
- **Lat/Lng tokens** (example: `51 53 58 N, 2 04 42 W`)

The app geocodes postcodes via **Postcodes.io** and place names via **OpenStreetMap Nominatim**, then queries:
- `https://data.police.uk/api/crimes-street/all-crime?lat=...&lng=...&date=YYYY-MM`

### Error handling
If an input cannot be resolved (invalid postcode / unknown place / malformed coordinates), the app shows a clear message in the UI.
If the Police API returns an error (400/429/503), the app surfaces a friendly error message rather than crashing.

## Data sources & licences 

- **UK Police Data API:** https://data.police.uk/docs/
- The site states its data is released under the **Open Government Licence v3.0** (OGL):
  https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
- `public/hero.svg` – front-page image
- `src/App.js` – UI + API + geocoding logic
- `src/App.css` – responsive layout + styling

### Tech
- React
- React Router
- Fetch-based APIs
- No backend (client-only)
## Tonight Test Pack (PowerShell)

Start dev servers:
```powershell
npm run dev
```

Build request body + UTF8 bytes:
```powershell
$body = @{
  useGemini = $true
  location = @{ name = "Manchester"; canonicalSlug = "manchester-england" }
  crimeStats = @{
    monthLabel = "Latest"
    incidentsThisMonth = 120
    topCategory = "anti-social behaviour"
    categoryShare = 24.5
    threeMonthAverage = 135
    trendCoverageMonths = 4
  }
  guardianHeadlines = @()
  imageManifest = @()
} | ConvertTo-Json -Depth 20

$bytes = [Text.Encoding]::UTF8.GetBytes($body)
$headers = @{ "Expect" = "" }
```

Echo test (vercel direct):
```powershell
iwr -Method Post http://localhost:3002/api/editorialize-echo -ContentType "application/json; charset=utf-8" -Headers $headers -Body $bytes -UseBasicParsing | select -Expand Content
```
Expect: keys include `location`, `crimeStats`, `imageManifestIsArray` is `true`.

Editorialize fallback (vercel direct):
```powershell
$bodyFallbackObj = @{
  useGemini = $false
  location = @{ name = "Manchester"; canonicalSlug = "manchester-england" }
  crimeStats = @{
    monthLabel = "Latest"
    incidentsThisMonth = 120
    topCategory = "anti-social behaviour"
    categoryShare = 24.5
    threeMonthAverage = 135
    trendCoverageMonths = 4
  }
  guardianHeadlines = @()
  imageManifest = @()
}
$bodyFallback = $bodyFallbackObj | ConvertTo-Json -Depth 20
$bytesFallback = [Text.Encoding]::UTF8.GetBytes($bodyFallback)

iwr -Method Post http://localhost:3002/api/editorialize -ContentType "application/json; charset=utf-8" -Headers $headers -Body $bytesFallback -UseBasicParsing | select -Expand Content
```
Expect: 200 JSON with headline/seoTitle/signals etc.
Note: do not use string Replace; ConvertTo-Json includes spaces.

Editorialize Gemini (vercel direct):
```powershell
iwr -Method Post http://localhost:3002/api/editorialize -ContentType "application/json; charset=utf-8" -Headers $headers -Body $bytes -UseBasicParsing | select -Expand Content
```
Expect: 200 editorial JSON OR structured JSON error (not FUNCTION_INVOCATION_FAILED).

Repeat via CRA proxy (port 3000):
```powershell
iwr -Method Post http://localhost:3000/api/editorialize-echo -ContentType "application/json; charset=utf-8" -Headers $headers -Body $bytes -UseBasicParsing | select -Expand Content

iwr -Method Post http://localhost:3000/api/editorialize -ContentType "application/json; charset=utf-8" -Headers $headers -Body $bytesFallback -UseBasicParsing | select -Expand Content

iwr -Method Post http://localhost:3000/api/editorialize -ContentType "application/json; charset=utf-8" -Headers $headers -Body $bytes -UseBasicParsing | select -Expand Content
```

If echo shows missing fields, the client is not sending JSON correctly.
If echo is correct but editorialize INVALID_INPUT, server parsing is wrong (should not happen after this fix).
