import { BrowserRouter, Route, Routes } from "react-router";

import { ActivitiesPage } from "./components/Activities/ActivitiesPage";
import { CatalogPage } from "./components/Catalog/CatalogPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout/Layout";
import { ReadyGuard } from "./components/ReadyGuard";
import { AnalyticsProvider } from "./hooks/AnalyticsProvider";
import { NotificationProvider } from "./hooks/NotificationProvider";
import { PhoneVerificationProvider } from "./hooks/PhoneVerificationProvider";
import { PublicConfigurationProvider } from "./hooks/PublicConfigurationProvider";
import { UserProvider } from "./hooks/UserProvider";

export function App() {
  return (
    <NotificationProvider>
      <ErrorBoundary>
        <PublicConfigurationProvider>
          <UserProvider>
            <AnalyticsProvider>
              <PhoneVerificationProvider>
                <BrowserRouter>
                  <Routes>
                    <Route element={<ReadyGuard />}>
                      <Route element={<Layout />}>
                        <Route index element={<CatalogPage />} />
                        <Route path="activities" element={<ActivitiesPage />} />
                      </Route>
                    </Route>
                  </Routes>
                </BrowserRouter>
              </PhoneVerificationProvider>
            </AnalyticsProvider>
          </UserProvider>
        </PublicConfigurationProvider>
      </ErrorBoundary>
    </NotificationProvider>
  );
}
