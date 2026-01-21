import React, { useMemo, useState, useEffect } from "react";

function normalize(text) {
  return String(text || "").toLowerCase();
}

export default function CrimeTable({
  crimes = [],
  selectedCategory = "all",
  onCategoryChange,
  pageSize = 20,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set();
    crimes.forEach((crime) => set.add(normalize(crime.category) || "unknown"));
    return ["all", ...Array.from(set).sort()];
  }, [crimes]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return crimes.filter((crime) => {
      const cat = normalize(crime.category);
      if (selectedCategory !== "all" && cat !== selectedCategory) return false;
      if (!q) return true;
      const hay = [
        cat,
        crime.location?.name,
        crime.outcome,
        crime.date,
      ]
        .filter(Boolean)
        .join(" ");
      return normalize(hay).includes(q);
    });
  }, [crimes, query, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  function handleCategoryChange(value) {
    setPage(1);
    onCategoryChange?.(value);
  }

  return (
    <>
      <div className="tableControls">
        <input
          type="search"
          placeholder="Search category, street, outcome..."
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
        />
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "all" ? "All categories" : cat.replace(/-/g, " ")}
            </option>
          ))}
        </select>
        <span className="impactMeta">
          Showing {paged.length} of {filtered.length}
        </span>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Street</th>
              <th>Month</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((crime) => (
              <tr key={crime.id}>
                <td>{crime.category}</td>
                <td>{crime.location?.name || "Unknown"}</td>
                <td>{crime.date || "Unknown"}</td>
                <td>{crime.outcome || "None recorded"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tablePagination">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={pageSafe === 1}
        >
          Prev
        </button>
        <span>
          Page {pageSafe} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={pageSafe === totalPages}
        >
          Next
        </button>
      </div>
    </>
  );
}
