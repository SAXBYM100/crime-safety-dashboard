import React, { useEffect, useState } from "react";
import { setMeta } from "../seo";
import cities from "../data/cities.json";
import { generateJournalDrafts } from "../services/journalGenerator";

const DEFAULT_LOCATIONS = Object.values(cities)
  .map((city) => city.name)
  .filter(Boolean);

export default function JournalAdmin() {
  const [month, setMonth] = useState("");
  const [status, setStatus] = useState("published");
  const [withImages, setWithImages] = useState(true);
  const [imageTheme, setImageTheme] = useState("auto");
  const [postType, setPostType] = useState("auto");
  const [narrativeAngle, setNarrativeAngle] = useState("auto");
  const [structureVariant, setStructureVariant] = useState("auto");
  const [locationsCount, setLocationsCount] = useState(5);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const enabled = process.env.REACT_APP_JOURNAL_ADMIN === "true";

  useEffect(() => {
    setMeta("Journal Admin | Area IQ", "Manual journal generation console.");
  }, []);

  const handleGenerate = async () => {
    if (!enabled || running) return;
    setRunning(true);
    setResults([]);
    try {
      const locations = DEFAULT_LOCATIONS.slice(0, Math.max(1, locationsCount));
      const output = await generateJournalDrafts(locations, {
        monthYYYYMM: month,
        status,
        withImages,
        imageTheme,
        postType: postType === "auto" ? undefined : postType,
        narrativeAngle: narrativeAngle === "auto" ? undefined : narrativeAngle,
        structureVariant: structureVariant === "auto" ? undefined : structureVariant,
        overwriteExisting,
      });
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
