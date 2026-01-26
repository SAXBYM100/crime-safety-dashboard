import React, { useEffect, useState } from "react";
import { setMeta } from "../seo";
import cities from "../data/cities.json";
import { fetchCrimeStats } from "../journal/fetchCrimeStats";
import { fetchGuardianHeadlines } from "../journal/fetchGuardianHeadlines";
import { loadImageManifest } from "../journal/loadImageManifest";
import {
  createJournalArticle,
  deleteJournalArticlesBySlug,
  fetchJournalArticlesBySlug,
} from "../services/journalStore";

const DEFAULT_LOCATIONS = Object.entries(cities)
  .map(([slug, city]) => ({
    name: city.name,
    canonicalName: city.name,
    canonicalSlug: slug,
    lat: city.lat,
    lng: city.lng,
    population: city.population,
    policeForce: city.policeForce,
  }))
  .filter((city) => city.name);

export default function JournalAdmin() {
  const [month, setMonth] = useState("");
  const [status, setStatus] = useState("published");
  const [withImages, setWithImages] = useState(true);
  const [useGemini, setUseGemini] = useState(true);
  const [imageTheme, setImageTheme] = useState("auto");
  const [postType, setPostType] = useState("auto");
  const [narrativeAngle, setNarrativeAngle] = useState("auto");
  const [structureVariant, setStructureVariant] = useState("auto");
  const [locationsCount, setLocationsCount] = useState(5);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [banner, setBanner] = useState("");
  const enabled = process.env.REACT_APP_JOURNAL_ADMIN === "true";

  useEffect(() => {
    setMeta("Journal Admin | Area IQ", "Manual journal generation console.");
  }, []);

  const callEditorialize = async (payload) => {
    const res = await fetch("/api/editorialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (error) {
      data = null;
    }
    if (!res.ok || (data && data.error)) {
      const message = data?.message || data?.error || `Editorialize failed (${res.status})`;
      const error = new Error(message);
      error.payload = data || { error: "EDITORIALIZE_HTTP_ERROR", status: res.status };
      throw error;
    }
    return data;
  };

  const handleGenerate = async () => {
    if (!enabled || running) return;
    setRunning(true);
    setResults([]);
    setBanner("");
    try {
      const locations = DEFAULT_LOCATIONS.slice(0, Math.max(1, locationsCount));
      const imageManifest = await loadImageManifest();
      const output = [];

      for (const location of locations) {
        try {
          const crimeStats = await fetchCrimeStats(location, { monthYYYYMM: month });
          const guardianHeadlines = await fetchGuardianHeadlines(location.name, 5);
          const payload = await callEditorialize({
            useGemini,
            location: {
              ...location,
              canonicalSlug: crimeStats.canonicalSlug || location.canonicalSlug,
            },
            crimeStats,
            guardianHeadlines,
            imageManifest,
            options: {
              monthYYYYMM: month,
              status,
              withImages,
              imageTheme,
              postType: postType === "auto" ? undefined : postType,
              narrativeAngle: narrativeAngle === "auto" ? undefined : narrativeAngle,
              structureVariant: structureVariant === "auto" ? undefined : structureVariant,
            },
          });

          if (!overwriteExisting) {
            const existing = await fetchJournalArticlesBySlug(payload.slug);
            if (existing.length) {
              output.push({
                locationName: location.name,
                status: "skipped",
                error: "Article already exists for slug.",
              });
              continue;
            }
          } else {
            await deleteJournalArticlesBySlug(payload.slug);
          }

          const id = await createJournalArticle(payload);
          output.push({ locationName: location.name, status: "ok", id, slug: payload.slug });
        } catch (error) {
          const message = String(error?.message || "");
          const payload = error?.payload || {};
          if (payload?.error === "EDITORIALIZE_CRASH") {
            setBanner(`Editorialize crashed (${payload.phase}): ${payload.message || "unknown error"}`);
          } else if (payload?.error && payload?.error.startsWith("GEMINI_")) {
            setBanner(`Gemini error: ${payload.error} ${payload.details || payload.message || ""}`.trim());
          } else if (message.toLowerCase().includes("missing_env") || message.toLowerCase().includes("gemini")) {
            setBanner("Gemini not configured. Run npm run env:pull and restart npm run dev.");
          } else if (message.toLowerCase().includes("api_unreachable")) {
            setBanner("API unreachable. Ensure Vercel dev is running on port 3002.");
          }
          output.push({
            locationName: location.name,
            status: "error",
            error: error?.message || String(error),
          });
        }
      }
      setResults(output);
    } finally {
      setRunning(false);
    }
  };

  if (!enabled) {
    return (
      <div className="contentWrap pageShell journalAdmin">
        <h1>Journal admin</h1>
        <p>Admin tools are disabled in this environment.</p>
      </div>
    );
  }

  return (
    <div className="contentWrap pageShell journalAdmin">
      <h1>Journal admin</h1>
      <p>Generate draft or published journal articles for the top locations.</p>
      {banner && <p className="error">{banner}</p>}

      <div className="journalAdminPanel">
        <label className="journalAdminLabel">
          Data month (YYYY-MM)
          <input
            type="text"
            value={month}
            placeholder="Latest"
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <label className="journalAdminLabel">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
        <label className="journalAdminLabel">
          Post type
          <select value={postType} onChange={(e) => setPostType(e.target.value)}>
            <option value="auto">auto</option>
            <option value="Crime Trend Brief">Crime Trend Brief</option>
            <option value="Local Risk Snapshot">Local Risk Snapshot</option>
            <option value="Area Intelligence Update">Area Intelligence Update</option>
            <option value="Safety Signal Alert">Safety Signal Alert</option>
            <option value="Neighbourhood Watch Brief">Neighbourhood Watch Brief</option>
            <option value="Urban Risk Pulse">Urban Risk Pulse</option>
            <option value="Public Safety Intelligence Note">Public Safety Intelligence Note</option>
          </select>
        </label>
        <label className="journalAdminLabel">
          Narrative angle
          <select value={narrativeAngle} onChange={(e) => setNarrativeAngle(e.target.value)}>
            <option value="auto">auto</option>
            <option value="data-first">data-first</option>
            <option value="community-first">community-first</option>
            <option value="property-first">property-first</option>
            <option value="infrastructure-first">infrastructure-first</option>
            <option value="policing-first">policing-first</option>
          </select>
        </label>
        <label className="journalAdminLabel">
          Structure variant
          <select value={structureVariant} onChange={(e) => setStructureVariant(e.target.value)}>
            <option value="auto">auto</option>
            <option value="Executive Brief">Executive Brief</option>
            <option value="Intelligence Bulletin">Intelligence Bulletin</option>
            <option value="Analyst Note">Analyst Note</option>
            <option value="Situation Update">Situation Update</option>
          </select>
        </label>
        <label className="journalAdminLabel">
          Include images
          <input
            type="checkbox"
            checked={withImages}
            onChange={(e) => setWithImages(e.target.checked)}
          />
        </label>
        <label className="journalAdminLabel">
          Use Gemini editorial mode
          <input
            type="checkbox"
            checked={useGemini}
            onChange={(e) => setUseGemini(e.target.checked)}
          />
        </label>
        <label className="journalAdminLabel">
          Image theme
          <select value={imageTheme} onChange={(e) => setImageTheme(e.target.value)}>
            <option value="auto">auto</option>
            <option value="street">street</option>
            <option value="aerial">aerial</option>
            <option value="night">night</option>
            <option value="residential">residential</option>
            <option value="generic-uk">generic-uk</option>
          </select>
        </label>
        <label className="journalAdminLabel">
          Locations count
          <input
            type="number"
            min="1"
            max={DEFAULT_LOCATIONS.length}
            value={locationsCount}
            onChange={(e) => setLocationsCount(Number(e.target.value) || 1)}
          />
        </label>
        <label className="journalAdminLabel">
          Overwrite existing
          <input
            type="checkbox"
            checked={overwriteExisting}
            onChange={(e) => setOverwriteExisting(e.target.checked)}
          />
        </label>
        <button className="primaryButton" type="button" onClick={handleGenerate} disabled={running}>
          {running ? "Generating..." : "Generate articles"}
        </button>
      </div>

      <div className="journalAdminResults">
        <strong>Generation plan</strong>
        <p>
          Locations: {Math.max(1, locationsCount)} | Month: {month || "Latest"} | Status: {status}
        </p>
        <p>
          Post type: {postType} | Narrative angle: {narrativeAngle} | Structure: {structureVariant}
        </p>
        <p>
          Images: {withImages ? "on" : "off"} | Theme: {imageTheme} | Overwrite: {overwriteExisting ? "yes" : "no"}
        </p>
        <p>
          Gemini editorial: {useGemini ? "on" : "off"}
        </p>
      </div>

      {results.length > 0 && (
        <div className="journalAdminResults">
          {results.map((item) => (
            <div key={item.locationName} className="journalAdminResult">
              <strong>{item.locationName}</strong>
              <span>{item.status}</span>
              {item.error && <span className="error">{item.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
