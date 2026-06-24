import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '../src/lib/theme';
import LandingPage from '../src/pages/LandingPage';

describe('LandingPage', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </BrowserRouter>
    );
  };

  it('renders the hero section with correct text', () => {
    renderWithRouter(<LandingPage />);
    expect(screen.getByText('One Tap. Every Profile.')).toBeInTheDocument();
    expect(screen.getByText(/DevCard is the developer-first profile exchange platform/i)).toBeInTheDocument();
  });

  it('renders disabled mobile app button', () => {
    renderWithRouter(<LandingPage />);
    const appButton = screen.getByText('Mobile App Coming Soon');
    expect(appButton).toBeInTheDocument();
    expect(appButton).toBeDisabled();
  });

  it('renders github link in hero', () => {
    renderWithRouter(<LandingPage />);
    const githubLink = screen.getByRole('link', { name: /View on GitHub/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/Dev-Card/DevCard');
  });

  it('renders community links correctly', () => {
    renderWithRouter(<LandingPage />);
    
    const discordLink = screen.getByText(/Join our Discord/i);
    expect(discordLink).toHaveAttribute('href', 'https://discord.gg/R5AmTHgnm');

    const guideLink = screen.getByText(/Developer Guide/i);
    expect(guideLink).toHaveAttribute('href', 'https://github.com/Dev-Card/DevCard/blob/main/CONTRIBUTING.md');
    
    const starRepoLink = screen.getByText(/Star the Repo/i);
    expect(starRepoLink).toHaveAttribute('href', 'https://github.com/Dev-Card/DevCard');
  });

  it('renders the features grid', () => {
    renderWithRouter(<LandingPage />);
    expect(screen.getByText('NFC Tap & Share')).toBeInTheDocument();
    expect(screen.getByText('All Platforms, One Card')).toBeInTheDocument();
    expect(screen.getByText('Open Source Community')).toBeInTheDocument();
  });
});
