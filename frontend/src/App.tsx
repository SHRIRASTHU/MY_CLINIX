import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { PatientProvider } from './hooks/usePatient';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OverviewPage } from './pages/OverviewPage';
import { PassportPage } from './pages/PassportPage';
import { PatientsPage } from './pages/PatientsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { TimelinePage } from './pages/TimelinePage';
import { MedicationsPage } from './pages/MedicationsPage';
import { RecoveryPage } from './pages/RecoveryPage';
import { ConditionsAnalysisPage } from './pages/ConditionsAnalysisPage';
import { ConflictsPage } from './pages/ConflictsPage';
import { MissingInformationPage } from './pages/MissingInformationPage';
import { ReviewPage } from './pages/ReviewPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PatientProvider>
          <Routes>
            {/* Public Authentication Routes */}
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
              
              {/* Section 0: Global Health Passport */}
              <Route path="passport" element={<PassportPage />} />

              {/* Section 1: Overview */}
              <Route path="overview" element={<OverviewPage />} />

              {/* Section 2: Medical Documents */}
              <Route path="documents" element={<DocumentsPage />} />

              {/* Section 3: Medical Timeline */}
              <Route path="timeline" element={<TimelinePage />} />

              {/* Section 4: Medication History */}
              <Route path="medications" element={<MedicationsPage />} />

              {/* Section 5: View Patient's Record & Recovery */}
              <Route path="recovery" element={<RecoveryPage />} />

              {/* Section 6: Conditions & Analysis */}
              <Route path="conditions-analysis" element={<ConditionsAnalysisPage />} />

              {/* Section 8: Conflicts */}
              <Route path="conflicts" element={<ConflictsPage />} />

              {/* Section 9: Missing Information */}
              <Route path="missing-information" element={<MissingInformationPage />} />

              {/* Section 10: Settings */}
              <Route path="settings" element={<SettingsPage />} />

              {/* Patient Management (for Doctor & Administrator) */}
              <Route path="patients" element={<PatientsPage />} />

              {/* Doctor Review & Verification (Doctor & Administrator) */}
              <Route
                path="review"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'doctor']}>
                    <ReviewPage />
                  </ProtectedRoute>
                }
              />

              {/* Platform Analytics & Monitoring (Administrator Only) */}
              <Route
                path="analytics"
                element={
                  <ProtectedRoute allowedRoles={['administrator']}>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />

              {/* Backward Compatibility Redirects */}
              <Route path="conditions-allergies" element={<Navigate to="/conditions-analysis" replace />} />
              <Route path="investigations" element={<Navigate to="/recovery" replace />} />
              <Route path="ask-ai" element={<Navigate to="/overview" replace />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </PatientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
