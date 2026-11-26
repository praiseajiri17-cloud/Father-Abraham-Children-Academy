/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppAuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicOnlyAuthRoute } from './components/auth/PublicOnlyAuthRoute';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

import { Home } from './pages/Home/Home';
import { About } from './pages/About/About';
import { Academics } from './pages/Academics/Academics';
import { Creche } from './pages/Academics/Creche';
import { Primary } from './pages/Academics/Primary';
import { Secondary } from './pages/Academics/Secondary';
import { Admissions } from './pages/Admissions/Admissions';
import { SchoolLife } from './pages/SchoolLife/SchoolLife';
import { News } from './pages/News/News';
import { Gallery } from './pages/Gallery/Gallery';
import { Contact } from './pages/Contact/Contact';
import { Portal } from './pages/Portal/Portal';
import { Login } from './pages/Portal/Login';
import { Register } from './pages/Portal/Register';
import { ParentPortal } from './pages/Portal/ParentPortal';
import { TeacherPortal } from './pages/Portal/TeacherPortal';
import { AdminPortal } from './pages/Portal/AdminPortal';

// Scroll to top on route change helper
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
};

export default function App() {
  return (
    <Router>
      <AppAuthProvider>
        <ScrollToTop />
        <div className="flex flex-col min-h-screen bg-white text-slate-800 font-sans selection:bg-[#D9B76A]/30 selection:text-[#102B46]">
          <AnnouncementBar />
          <Header />

          <main className="flex-1">
            <Routes>
              {/* Public Website Routes (unrestricted) */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/academics" element={<Academics />} />
              <Route path="/academics/creche" element={<Creche />} />
              <Route path="/academics/primary" element={<Primary />} />
              <Route path="/academics/secondary" element={<Secondary />} />
              <Route path="/admissions" element={<Admissions />} />
              <Route path="/school-life" element={<SchoolLife />} />
              <Route path="/news" element={<News />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/contact" element={<Contact />} />

              {/* Authentication Routes */}
              <Route
                path="/portal/login/*"
                element={
                  <PublicOnlyAuthRoute>
                    <Login />
                  </PublicOnlyAuthRoute>
                }
              />
              <Route
                path="/portal/register/*"
                element={
                  <PublicOnlyAuthRoute>
                    <Register />
                  </PublicOnlyAuthRoute>
                }
              />

              {/* Protected Portal Routes */}
              <Route
                path="/portal"
                element={
                  <ProtectedRoute sectionTitle="School Portal">
                    <Portal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/parent"
                element={
                  <ProtectedRoute
                    requiredRoles={['parent']}
                    sectionTitle="Parent & Guardian Portal"
                  >
                    <ParentPortal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/teacher"
                element={
                  <ProtectedRoute
                    requiredRoles={['teacher']}
                    sectionTitle="Teacher & Caregiver Portal"
                  >
                    <TeacherPortal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/admin"
                element={
                  <ProtectedRoute
                    requiredRoles={[
                      'general_admin',
                      'principal',
                      'admission_officer',
                      'finance_officer',
                      'secretary',
                    ]}
                    sectionTitle="Administration Portal"
                  >
                    <AdminPortal />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>

          <Footer />
        </div>
      </AppAuthProvider>
    </Router>
  );
}
