import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Github } from 'lucide-react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import CellCountingV8 from './pages/CellCountingV8';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/cell-counting" element={<CellCountingV8 />} />
          <Route path="/cell-counting-v8" element={<CellCountingV8 />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
        <footer className="mt-16 border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              © {new Date().getFullYear()} Theodor C. M. Waalberg & Lowkey Vision. All rights reserved.
            </div>
            <div className="text-xs text-gray-500 max-w-3xl">
              ...
            </div>
            <a
              href="https://github.com/Twaal/lowkey-vision"
              target="_blank"
              rel="noreferrer"
              aria-label="Lowkey Vision on GitHub"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </footer>
        <Analytics />
      </div>
    </Router>
  );
};

export default App;