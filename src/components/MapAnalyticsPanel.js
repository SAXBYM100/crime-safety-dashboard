import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Rectangle } from "react-leaflet";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toRad(n) {
  return (n * Math.PI) / 180;
}

function distanceMiles(a, b) {
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const h =
    sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function normalizeCategory(cat) {
  return String(cat || "").toLowerCase().trim();
}

function getBounds(points, center) {
  if (!points.length) {
    return {
      minLat: center.lat - 0.01,
      maxLat: center.lat + 0.01,
      minLon: center.lon - 0.015,
      maxLon: center.lon + 0.015,
    };
  }
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLon = points[0].lon;
  let maxLon = points[0].lon;
  points.forEach((p) => {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  });
  const padLat = Math.max((maxLat - minLat) * 0.15, 0.005);
  const padLon = Math.max((maxLon - minLon) * 0.15, 0.005);
  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLon: minLon - padLon,
    maxLon: maxLon + padLon,
  };
}

function binPoints(points, bounds, gridSize) {
  const bins = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => 0)
  );
  points.forEach((p) => {
    const x = clamp(
      Math.floor(((p.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * gridSize),
      0,
      gridSize - 1
    );
    const y = clamp(
      Math.floor(((bounds.maxLat - p.lat) / (bounds.maxLat - bounds.minLat)) * gridSize),
      0,
      gridSize - 1
    );
    bins[y][x] += 1;
  });
  return bins;
}

function hotspotLabels(bins, center, bounds) {
  const flat = [];
  for (let y = 0; y < bins.length; y += 1) {
    for (let x = 0; x < bins[y].length; x += 1) {
      const count = bins[y][x];
      if (count > 0) flat.push({ x, y, count });
    }
  }
  flat.sort((a, b) => b.count - a.count);
  return flat.slice(0, 3).map((cell) => {
    const lat = bounds.maxLat - ((cell.y + 0.5) / bins.length) * (bounds.maxLat - bounds.minLat);
    const lon = bounds.minLon + ((cell.x + 0.5) / bins.length) * (bounds.maxLon - bounds.minLon);
    const label =
      lat >= center.lat
        ? lon >= center.lon
          ? "Northeast"
          : "Northwest"
        : lon >= center.lon
        ? "Southeast"
        : "Southwest";
    return { label, count: cell.count };
  });
}

export default function MapAnalyticsPanel({ crimes = [], center, selectedCategory, onCategoryChange }) {
  const [mode, setMode] = useState("points");
  const [categoryState, setCategoryState] = useState("all");
  const [radius, setRadius] = useState(1);
  const category = selectedCategory ?? categoryState;

  const categories = useMemo(() => {
    const set = new Set();
    crimes.forEach((crime) => set.add(normalizeCategory(crime.category) || "unknown"));
    return ["all", ...Array.from(set).sort()];
  }, [crimes]);

  const points = useMemo(() => {
    return crimes
      .map((crime) => ({
        lat: Number(crime.location?.lat),
        lon: Number(crime.location?.lon),
        category: normalizeCategory(crime.category),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  }, [crimes]);

  const filtered = useMemo(() => {
    if (!center || !points.length) return [];
    return points.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      const dist = distanceMiles(center, { lat: p.lat, lon: p.lon });
      return dist <= radius;
    });
  }, [points, center, category, radius]);

  const bounds = useMemo(() => getBounds(filtered, center || { lat: 51.5, lon: -0.12 }), [
    filtered,
    center,
  ]);

  const gridSize = 6;
  const bins = useMemo(() => binPoints(filtered, bounds, gridSize), [filtered, bounds]);
  const maxBin = Math.max(1, ...bins.flat());
  const hotspots = useMemo(() => hotspotLabels(bins, center || { lat: 0, lon: 0 }, bounds), [
    bins,
    bounds,
    center,
  ]);

  if (!center) {
    return (
      <div className="mapPanel">
        <div className="mapHeader">
          <div>
            <h3>Map analytics</h3>
            <p>Map view loads after a location is resolved.</p>
          </div>
        </div>
      </div>
    );
  }

  const zoom = radius <= 0.5 ? 14 : radius <= 1 ? 13 : 12;
  const hasPoints = filtered.length > 0;

  return (
    <div className="mapPanel">
      <div className="mapHeader">
        <div>
          <h3>Map analytics</h3>
          <p>Incidents within {radius} mi of the center point.</p>
        </div>
        <div className="mapControls">
          <div className="mapToggle">
            {["points", "heat", "grid"].map((key) => (
              <button
                key={key}
                type="button"
                className={mode === key ? "active" : ""}
                onClick={() => setMode(key)}
              >
                {key}
              </button>
            ))}
          </div>
          <select
            value={category}
            onChange={(e) => {
              const value = e.target.value;
              setCategoryState(value);
              onCategoryChange?.(value);
            }}
          >
            {categories.map((cat) => (
              <option value={cat} key={cat}>
                {cat === "all" ? "All categories" : cat.replace(/-/g, " ")}
              </option>
            ))}
          </select>
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            <option value={0.5}>0.5 mi</option>
            <option value={1}>1 mi</option>
            <option value={2}>2 mi</option>
          </select>
        </div>
      </div>

      <div className="mapCanvas">
        <MapContainer
          className="mapLeaflet"
          center={[center.lat, center.lon]}
          zoom={zoom}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mode === "points" &&
            filtered.map((p, idx) => (
              <CircleMarker
                key={`pt-${idx}`}
                center={[p.lat, p.lon]}
                radius={4}
                pathOptions={{ color: "#2f6b5d", weight: 1, fillOpacity: 0.6 }}
              />
            ))}

          {(mode === "heat" || mode === "grid") &&
            bins.map((row, y) =>
              row.map((value, x) => {
                if (!value) return null;
                const lat1 =
                  bounds.maxLat - (y / gridSize) * (bounds.maxLat - bounds.minLat);
                const lat2 =
                  bounds.maxLat -
                  ((y + 1) / gridSize) * (bounds.maxLat - bounds.minLat);
                const lon1 =
                  bounds.minLon + (x / gridSize) * (bounds.maxLon - bounds.minLon);
                const lon2 =
                  bounds.minLon +
                  ((x + 1) / gridSize) * (bounds.maxLon - bounds.minLon);
                const intensity = value / maxBin;
                return (
                  <Rectangle
                    key={`cell-${x}-${y}`}
                    bounds={[
                      [lat2, lon1],
                      [lat1, lon2],
                    ]}
                    pathOptions={{
                      color: mode === "grid" ? "rgba(255,255,255,0.6)" : "transparent",
                      weight: mode === "grid" ? 1 : 0,
                      fillColor: "#2f6b5d",
                      fillOpacity: mode === "heat" ? 0.15 + intensity * 0.55 : 0.12 + intensity * 0.35,
                    }}
                  />
                );
              })
            )}
        </MapContainer>

        {!hasPoints && <div className="mapEmpty">No incidents loaded yet.</div>}
      </div>

      <div className="mapFooter">
        <div>
          <strong>{filtered.length}</strong> incidents shown
        </div>
        <div className="mapHotspots">
          {hotspots.length > 0
            ? hotspots.map((spot, idx) => (
                <span key={`spot-${idx}`}>
                  {spot.label} ({spot.count})
                </span>
              ))
            : "No hotspot clusters yet"}
        </div>
      </div>
    </div>
  );
}
