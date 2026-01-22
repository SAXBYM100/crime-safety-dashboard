import React from "react";
import ResponsiveImage from "./ResponsiveImage";

const VARIANT_RATIO = {
  city: "21/9",
  guides: "21/9",
  guide: "21/9",
  area: "16/9",
};

export default function PageHeaderImage({
  src,
  alt,
  title,
  subtitle,
  variant = "guide",
  className = "",
}) {
  const ratio = VARIANT_RATIO[variant] || "21/9";

  return (
    <section className={`pageHeader pageHeader--${variant} ${className}`.trim()}>
      <ResponsiveImage src={src} alt={alt} aspectRatio={ratio} />
      <div className="pageHeaderOverlay" />
      {(title || subtitle) && (
        <div className="pageHeaderContent">
          {title && <h1 className="pageHeaderTitle">{title}</h1>}
          {subtitle && <p className="pageHeaderSubtitle">{subtitle}</p>}
        </div>
      )}
    </section>
  );
}
