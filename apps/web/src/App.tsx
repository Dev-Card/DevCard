import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProfilePage from './pages/ProfilePage';
import CardPage from './pages/CardPage';
import NotFound from './pages/NotFound';
import CreatePage from './pages/CreatePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EditProfilePage from './pages/EditProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/u/:username" element={<ProfilePage />} />
      <Route path="/devcard/:id" element={<CardPage />} />
      <Route path="*" element={<NotFound />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/edit-profile" element={<EditProfilePage />} />
      <Route path="/u/:username" element={<PublicProfilePage />} />
    </Routes>
  );
}
