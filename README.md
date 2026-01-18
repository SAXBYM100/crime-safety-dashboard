# Crime & Safety Dashboard (Rich Web Application)

## How to run locally

1. Install Node.js (LTS recommended)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open: `http://localhost:3000`


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
