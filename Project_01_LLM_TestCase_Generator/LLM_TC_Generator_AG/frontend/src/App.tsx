import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Settings as SettingsIcon, LayoutTemplate, Activity, History } from 'lucide-react';
import GeneratorView from './pages/GeneratorView';
import HistoryView from './pages/HistoryView';
import SettingsView from './pages/SettingsView';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Header Navigation */}
        <header className="header">
          <div className="header-brand">
            <Activity size={24} />
            LLM Test Case Generator
          </div>
          <nav className="nav-links">
            <NavLink 
              to="/" 
              end
              className={({ isActive }) => `nav-link flex-row gap-2 ${isActive ? 'active' : ''}`}
            >
              <LayoutTemplate size={18} />
              Generator
            </NavLink>
            <NavLink 
              to="/history" 
              className={({ isActive }) => `nav-link flex-row gap-2 ${isActive ? 'active' : ''}`}
            >
              <History size={18} />
              History
            </NavLink>
            <NavLink 
              to="/settings" 
              className={({ isActive }) => `nav-link flex-row gap-2 ${isActive ? 'active' : ''}`}
            >
              <SettingsIcon size={18} />
              Settings
            </NavLink>
          </nav>
        </header>

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<GeneratorView />} />
            <Route path="/history" element={<HistoryView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
