import { BrowserRouter, Route, Routes } from "react-router";

import { ActivitiesPage } from "./components/Activities/ActivitiesPage";
import { CatalogPage } from "./components/Catalog/CatalogPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout/Layout";
import { SupportPage } from "./components/Support/SupportPage";
import { AnalyticsProvider } from "./hooks/AnalyticsProvider";
import { NotificationProvider } from "./hooks/NotificationProvider";
import { PhoneVerificationProvider } from "./hooks/PhoneVerificationProvider";
import { PublicConfigurationProvider } from "./hooks/PublicConfigurationProvider";
import { ThemeProvider } from "./hooks/ThemeProvider";
import { UserProvider } from "./hooks/UserProvider";
import type { BootstrapData } from "./types/main";

export function App({ bootstrapData }: { bootstrapData: BootstrapData }) {
  return (
    <NotificationProvider>
      <ErrorBoundary>
        <PublicConfigurationProvider bootstrapData={bootstrapData}>
          <UserProvider bootstrapData={bootstrapData}>
            <AnalyticsProvider>
              <PhoneVerificationProvider>
                <ThemeProvider>
                  <BrowserRouter>
                    <Routes>
                      <Route element={<Layout />}>
                        <Route index element={<CatalogPage />} />
                        <Route path="activities" element={<ActivitiesPage />} />
                        <Route path="support" element={<SupportPage />} />
                      </Route>
                    </Routes>
                  </BrowserRouter>
                </ThemeProvider>
              </PhoneVerificationProvider>
            </AnalyticsProvider>
          </UserProvider>
        </PublicConfigurationProvider>
      </ErrorBoundary>
    </NotificationProvider>
  );
}
