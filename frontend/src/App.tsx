import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { PatientProvider } from './hooks/usePatient';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OverviewPage } from './pages/OverviewPage';
import { PatientsPage } from './pages/PatientsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { TimelinePage } from './pages/TimelinePage';
import { MedicationsPage } from './pages/MedicationsPage';
import { ConditionsAllergiesPage } from './pages/ConditionsAllergiesPage';
import { InvestigationsPage } from './pages/InvestigationsPage';
import { ConflictsPage } from './pages/ConflictsPage';
import { AskAiPage } from './pages/AskAiPage';
import { ReviewPage } from './pages/ReviewPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PatientProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Application Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/overview" replace />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="patients" element={<PatientsPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="timeline" element={<TimelinePage />} />
              <Route path="medications" element={<MedicationsPage />} />
              <Route path="conditions-allergies" element={<ConditionsAllergiesPage />} />
              <Route path="investigations" element={<InvestigationsPage />} />
              <Route path="conflicts" element={<ConflictsPage />} />
              <Route path="ask-ai" element={<AskAiPage />} />
              <Route path="review" element={<ReviewPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </PatientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
