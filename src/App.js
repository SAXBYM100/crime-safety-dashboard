import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import SiteLayout from "./components/SiteLayout";
import GlobalLoadingOverlay from "./components/GlobalLoadingOverlay";
import { LoadingProvider } from "./context/LoadingContext";
import AdminBar from "./components/AdminBar";

import HomeRoute from "./pages/HomeRoute";
import HomePage from "./pages/HomePage";
import PostcodePage from "./pages/PostcodePage";
import PlacePage from "./pages/PlacePage";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import Methodology from "./pages/Methodology";
import DataSources from "./pages/DataSources";
import ReportPage from "./pages/ReportPage";
import ProPage from "./pages/ProPage";
import ReportsPage from "./pages/ReportsPage";
import ProCityLanding from "./pages/pro/ProCityLanding";
import JournalIndex from "./pages/JournalIndex";
import JournalArticle from "./pages/JournalArticle";
import JournalAdmin from "./pages/JournalAdmin";
import GuidesIndex from "./pages/GuidesIndex";
import GuideCrimeData from "./pages/guides/GuideCrimeData";
import GuideSafeTravel from "./pages/guides/GuideSafeTravel";
import GuideMovingHome from "./pages/guides/GuideMovingHome";
import AreasIndex from "./pages/AreasIndex";
import AreaPage from "./pages/areas/AreaPage";
import CityIndex from "./pages/CityIndex";
import CityPage from "./pages/CityPage";

export default function App() {
  return (
    <LoadingProvider>
      <AdminBar />
      <GlobalLoadingOverlay />

      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/app" element={<HomeRoute />} />
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/postcode/:postcode" element={<PostcodePage />} />
          <Route path="/place/:placeName" element={<PlacePage />} />

          <Route path="/guides" element={<GuidesIndex />} />
          <Route path="/guides/how-uk-crime-data-works" element={<GuideCrimeData />} />
          <Route path="/guides/staying-safe-at-night" element={<GuideSafeTravel />} />
          <Route path="/guides/moving-to-a-new-area" element={<GuideMovingHome />} />

          <Route path="/areas" element={<AreasIndex />} />
          <Route path="/areas/:areaSlug" element={<AreaPage />} />
          <Route path="/city" element={<CityIndex />} />
          <Route path="/city/:citySlug" element={<CityPage />} />
          <Route path="/is-:citySlug-safe" element={<CityPage />} />
          <Route path="/:citySlug-crime-rate" element={<CityPage />} />
          <Route path="/safest-areas-in-:citySlug" element={<CityPage />} />

          <Route path="/about" element={<About />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/data-sources" element={<DataSources />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/report" element={<ReportPage />} />
          <Route path="/reports" element={<ReportsPage />} />

          <Route path="/journal" element={<JournalIndex />} />
          <Route path="/journal/:slug" element={<JournalArticle />} />
          <Route path="/journal-admin" element={<JournalAdmin />} />

          <Route path="/pro" element={<ProPage />} />
          <Route path="/pro/city/:citySlug" element={<ProCityLanding />} />

          <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
          <Route path="/cookies" element={<Navigate to="/privacy-policy" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LoadingProvider>
  );
}
