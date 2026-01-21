import React from "react";

export default function ResponsiveImage({
  src,
  alt,
  className = "",
  priority = false,
  aspectRatio = "16/9",
  fill = false,
}) {
  const loading = priority ? "eager" : "lazy";
  const fetchpriority = priority ? "high" : "auto";

  return (
    <div
      className={`responsiveImageWrap ${fill ? "responsiveImageFill" : ""} ${className}`.trim()}
      style={fill ? undefined : { aspectRatio }}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchpriority={fetchpriority}
        className="responsiveImage"
      />
    </div>
  );
}
