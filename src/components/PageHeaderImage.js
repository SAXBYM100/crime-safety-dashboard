import React from "react";
import ResponsiveImage from "./ResponsiveImage";

export default function PageHeaderImage({
  src,
  alt,
  title,
  subtitle,
  variant = "guide",
  className = "",
}) {
  return (
    <section className={`pageHeader pageHeader--${variant} ${className}`.trim()}>
      <ResponsiveImage src={src} alt={alt} fill />
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
