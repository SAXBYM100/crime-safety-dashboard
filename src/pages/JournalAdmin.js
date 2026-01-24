import React, { useEffect, useState } from "react";
import { setMeta } from "../seo";
import cities from "../data/cities.json";
import { generateJournalDrafts } from "../services/journalGenerator";

const DEFAULT_LOCATIONS = Object.values(cities)
  .slice(0, 10)
  .map((city) => city.name)
  .filter(Boolean);

export default function JournalAdmin() {
  const [month, setMonth] = useState("");
  const [status, setStatus] = useState("published");
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
      const output = await generateJournalDrafts(DEFAULT_LOCATIONS, {
        monthYYYYMM: month,
        status,
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
        <button className="primaryButton" type="button" onClick={handleGenerate} disabled={running}>
          {running ? "Generating..." : "Generate articles"}
        </button>
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
