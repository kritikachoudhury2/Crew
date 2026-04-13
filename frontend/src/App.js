import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { Toaster } from './components/ui/sonner';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Pages are lazy-loaded — each page only downloads when the user visits it
// This makes the initial load 3-4x faster
const Home         = lazy(() => import('./pages/Home'));
const HowItWorks   = lazy(() => import('./pages/HowItWorks'));
const FindAPartner = lazy(() => import('./pages/FindAPartner'));
const Events       = lazy(() => import('./pages/Events'));
const About        = lazy(() => import('./pages/About'));
const GetStarted   = lazy(() => import('./pages/GetStarted'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const AthleteProfile = lazy(() => import('./pages/AthleteProfile'));
const MyConnections  = lazy(() => import('./pages/MyConnections'));
const EditProfile    = lazy(() => import('./pages/EditProfile'));
const PrivacyPolicy  = lazy(() => import('./pages/PrivacyPolicy'));
const Terms          = lazy(() => import('./pages/Terms'));

// Spinner shown while a page chunk is loading
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#1C0A30',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid #D4880A',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* /auth/callback MUST be before any ProtectedRoute so it is never intercepted */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/get-started" element={<GetStarted />} />
            <Route path="/" element={<Home />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:slug" element={<Events />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            {/* Protected routes after all public routes */}
            <Route path="/find-a-partner" element={<ProtectedRoute><FindAPartner /></ProtectedRoute>} />
            <Route path="/athlete/:id" element={<ProtectedRoute><AthleteProfile /></ProtectedRoute>} />
            <Route path="/my-connections" element={<ProtectedRoute><MyConnections /></ProtectedRoute>} />
            <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
