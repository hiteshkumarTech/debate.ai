import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingSignIn from './components/FloatingSignIn';
import MobileNotice from './components/MobileNotice';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Debate from './pages/Debate';
import Progress from './pages/Progress';
import History from './pages/History';
import Interview from './pages/Interview';
import Leaderboard from './pages/Leaderboard';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Personas from './pages/Personas';
import Achievements from './pages/Achievements';

// The "/" route is the entry point. Per the product brief, signed-in users
// land on their Dashboard; signed-out visitors see the marketing Landing
// page. While auth is still resolving we render nothing to avoid flashing
// the wrong one for a moment.
function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Dashboard /> : <Landing />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Direct, always-available dashboard route (also reachable
              for signed-out users, which simply shows its empty state). */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/debate" element={<Debate />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/history" element={<History />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/personas" element={<Personas />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
        </Routes>
        <Footer />
        <FloatingSignIn />
        <MobileNotice />
      </BrowserRouter>
    </AuthProvider>
  );
}
