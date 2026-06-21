import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
import Explore from './pages/Explore';
import HowItWorks from './pages/HowItWorks';
import Personas from './pages/Personas';
import Achievements from './pages/Achievements';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Dashboard /> : <Landing />;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/debate" element={<Debate />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/history" element={<History />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/personas" element={<Personas />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/about" element={<About />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <AnimatedRoutes />
        <Footer />
        <FloatingSignIn />
        <MobileNotice />
      </BrowserRouter>
    </AuthProvider>
  );
}