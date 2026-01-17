import React from "react";
import StaticPage from "./StaticPage";

export default function Cookies() {
  return (
    <StaticPage title="Cookies" description="LocalStorage and caching details.">
      <p>
        This site uses localStorage to cache API responses and reduce repeated requests.
      </p>
    </StaticPage>
  );
}
