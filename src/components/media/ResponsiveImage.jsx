import React, { useState } from "react";

export default function ResponsiveImage({
  src,
  alt,
  className = "",
  priority = false,
  aspectRatio = "21/9",
}) {
  const [hasError, setHasError] = useState(false);
  const loading = priority ? "eager" : "lazy";
  const fetchpriority = priority ? "high" : "auto";

  return (
    <div
      className={`responsiveImageWrap ${hasError ? "responsiveImageError" : ""} ${className}`.trim()}
      style={{ aspectRatio }}
    >
      {!hasError && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchpriority={fetchpriority}
          className="responsiveImage"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
