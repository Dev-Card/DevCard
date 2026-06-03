import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProfilePage from './pages/ProfilePage';
import CardPage from './pages/CardPage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/u/:username" element={<ProfilePage />} />
      <Route path="/devcard/:id" element={<CardPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
