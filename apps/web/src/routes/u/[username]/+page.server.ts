import type { PageServerLoad } from './$types';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ params, fetch }) => {
  try {
    const res = await fetch(`${API_BASE}/api/u/${params.username}?source=web`);
    if (!res.ok) {
      // Fallback to mock data for demonstration if user not found or backend error
      return { 
        profile: getMockProfile(params.username), 
        error: null 
      };
    }
    const profile = await res.json();
    return { profile, error: null };
  } catch {
    // Fallback to mock data if backend is not running
    return { 
      profile: getMockProfile(params.username), 
      error: null 
    };
  }
};

function getMockProfile(username: string) {
  return {
    displayName: username.charAt(0).toUpperCase() + username.slice(1),
    username: username,
    bio: "Full-stack developer building the future of open-source developer profiles. Obsessed with clean UI and high performance.",
    role: "Senior Software Engineer",
    company: "DevCard Inc.",
    pronouns: "he/him",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + username,
    accentColor: "#6366F1",
    links: [
      { platform: "github", username: username, url: "https://github.com/" + username },
      { platform: "linkedin", username: username, url: "https://linkedin.com/in/" + username },
      { platform: "twitter", username: username, url: "https://twitter.com/" + username },
      { platform: "portfolio", username: "My Portfolio", url: "https://devcard.io" }
    ]
  };
}
