# QA Checklist

Run through this checklist before deploying:

- `npm install`
- `npm run build`
- Open `/` and confirm the content homepage loads with ads on the page.
- Open `/app` and confirm no ads render on the tool UI.
- Search a postcode in `/app` and confirm results load.
- Open `/report?kind=postcode&q=SW1A%201AA` and confirm report loads.
- Open `/pro` and confirm the Pro plan page renders.
- Open `/pro/city/london` and confirm the brief loads.
- Open `/guides/how-uk-crime-data-works` and confirm ads render.
- Open `/areas/london` and confirm ads render.
- Open `/privacy-policy`, `/terms`, `/contact`, and confirm footer links work.
- Confirm `/privacy` and `/cookies` redirect to `/privacy-policy`.
- Check `/api/area-report?lat=51.5072&lon=-0.1276` returns JSON.
- Check `/api/trends?lat=51.5072&lon=-0.1276` returns JSON.
- Mobile widths: verify 320/360/375/414 have no horizontal scroll.
