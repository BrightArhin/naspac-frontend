import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import PersonnelLogin from './pages/PersonnelLogin'
import StaffLogin from './pages/StaffLogin';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import Onboarding from './pages/Onboarding';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { AuthProvider, useAuth } from './AuthContext';
import OnboardingForm from './pages/OnboardingForm';
import PersonnelSelection from './pages/PersonnelSelection';
import Endorsement from './pages/Endorsement';
import Profile from './pages/Profile';
import StaffManagement from './pages/StaffManagement';
import DepartmentPlacements from './pages/DeptPlacements';
import ManagePersonnel from './pages/ManagePersonnel';
import { Spin } from 'antd';
import NotificationsPage from './pages/NotificationsPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SendAppointmentLetters from './pages/SendAppointmentLetters';
import Onboarded from './pages/Onboarded';

const centeredSpinStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, isLoading } = useAuth();
 if (isLoading) {
    return (
      <div style={centeredSpinStyle}>
        <Spin size="large" />
      </div>
    );
  }
  if (!role) {
    console.log('No role, redirecting to /login');
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const MainLayout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const closeDrawer = () => {
      if (media.matches) setMobileNavOpen(false);
    };
    media.addEventListener('change', closeDrawer);
    return () => media.removeEventListener('change', closeDrawer);
  }, []);

  return (
   <div className="flex h-dvh overflow-hidden">
    <ToastContainer  position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover/>
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#f3f0eb] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
    <Router>
      <Routes>
        {/* Routes with Header and Sidebar */}
        <Route element={<MainLayout />}>
           <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
              <Route
              path="/onboarding-form"
              element={
                  <OnboardingForm/>
              }
            />
            <Route
              path="/shortlist"
              element={
                <ProtectedRoute>
                  <PersonnelSelection />
                </ProtectedRoute>
              }
            />
             <Route
              path="/endorsement"
              element={
                <ProtectedRoute>
                  <Endorsement />
                </ProtectedRoute>
              }
            />
                <Route
              path="/staff-management"
              element={
                <ProtectedRoute>
                  <StaffManagement />
                </ProtectedRoute>
              }
            />
                <Route
              path="/dept-placements"
              element={
                <ProtectedRoute>
                  <DepartmentPlacements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-personnel"
              element={
                <ProtectedRoute>
                  <ManagePersonnel />
                </ProtectedRoute>
              }
            />
             <Route
              path="/send-letters"
              element={
                <ProtectedRoute>
                  <SendAppointmentLetters />
                </ProtectedRoute>
              }
            />
              <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
             <Route
              path="/onboarded"
              element={
                <ProtectedRoute>
                  <Onboarded />
                </ProtectedRoute>
              }
            />
             <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
        </Route>
        {/* Routes without Header and Sidebar */}
        <Route path="/login" element={<PersonnelLogin />} />
        <Route path="/staff-login" element={<StaffLogin />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Routes>
    </Router>
    </AuthProvider>
  );
}

export default App;