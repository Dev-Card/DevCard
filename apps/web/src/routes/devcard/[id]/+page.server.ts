import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const { id } = params;

	try {
		const res = await fetch(`http://localhost:3000/api/u/card/${id}`);

		if (!res.ok) {
			return { card: getMockCard(id) };
		}

		const card = await res.json();
		return { card };
	} catch {
		return { card: getMockCard(id) };
	}
};

function getMockCard(id: string) {
	return {
		id,
		title: 'PRO Developer Card',
		links: [
			{ platform: 'github', username: 'dev', url: 'https://github.com' },
			{ platform: 'linkedin', username: 'dev', url: 'https://linkedin.com' }
		],
		owner: {
			displayName: 'John Doe',
			role: 'Full Stack Developer',
			company: 'Open Source',
			avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
			accentColor: '#6366F1',
			bio: 'Building the next generation of developer tools.'
		}
	};
}
