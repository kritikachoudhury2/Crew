import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import FindAPartner from './pages/FindAPartner';
import Events from './pages/Events';
import About from './pages/About';
import GetStarted from './pages/GetStarted';
import AuthCallback from './pages/AuthCallback';
import AthleteProfile from './pages/AthleteProfile';
import MyConnections from './pages/MyConnections';
import EditProfile from './pages/EditProfile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import './App.css';

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/find-a-partner" element={<ProtectedRoute><FindAPartner /></ProtectedRoute>} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:slug" element={<Events />} />
          <Route path="/about" element={<About />} />
          <Route path="/get-started" element={<GetStarted />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/athlete/:id" element={<ProtectedRoute><AthleteProfile /></ProtectedRoute>} />
          <Route path="/my-connections" element={<ProtectedRoute><MyConnections /></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
