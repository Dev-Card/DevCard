import { PrismaClient, Role, CardVisibility, TeamRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DevCard database...');

  // ---------------------------------------------------------------------------
  // Reset existing demo data (idempotent re-runs).
  // Order matters: Team.owner uses onDelete: Restrict, so teams must be removed
  // before their owning user. Most other relations cascade from the user.
  // ---------------------------------------------------------------------------
  const existing = await prisma.user.findUnique({
    where: { username: 'devcard-demo' },
    select: { id: true },
  });

  if (existing) {
    await prisma.teamMember.deleteMany({ where: { userId: existing.id } });
    await prisma.team.deleteMany({ where: { ownerId: existing.id } });
    await prisma.eventAttendee.deleteMany({ where: { userId: existing.id } });
    await prisma.event.deleteMany({ where: { organizerId: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });
  }

  // ---------------------------------------------------------------------------
  // User
  // ---------------------------------------------------------------------------
  const testUser = await prisma.user.create({
    data: {
      email: 'demo@devcard.dev',
      username: 'devcard-demo',
      displayName: 'Alex Chen',
      bio: 'Full-stack developer • Open source enthusiast • Builder of things',
      pronouns: 'they/them',
      role: 'Senior Software Engineer',
      authRole: Role.USER,
      company: 'OpenSource Inc.',
      avatarUrl: null,
      accentColor: '#6366f1',
      emailVerified: true,
      phoneNumber: '+10000000000',
      isActive: true,
      identities: {
        create: {
          provider: 'github',
          providerId: 'demo-12345',
        },
      },
    },
  });

  console.log(`  Created user: ${testUser.displayName} (@${testUser.username})`);

  // ---------------------------------------------------------------------------
  // Platform links
  // ---------------------------------------------------------------------------
  const linkData = [
    { platform: 'github', username: 'alexchen', url: 'https://github.com/alexchen' },
    { platform: 'linkedin', username: 'alexchen-dev', url: 'https://www.linkedin.com/in/alexchen-dev' },
    { platform: 'twitter', username: 'alexchendev', url: 'https://x.com/alexchendev' },
    { platform: 'devfolio', username: 'alexchen', url: 'https://devfolio.co/@alexchen' },
    { platform: 'portfolio', username: 'https://alexchen.dev', url: 'https://alexchen.dev' },
    { platform: 'leetcode', username: 'alexchen', url: 'https://leetcode.com/u/alexchen' },
    { platform: 'discord', username: 'alexchen#4242', url: '' },
    { platform: 'email', username: 'alex@devcard.dev', url: 'mailto:alex@devcard.dev' },
  ];

  const links = await Promise.all(
    linkData.map((data, displayOrder) =>
      prisma.platformLink.create({
        data: { userId: testUser.id, displayOrder, ...data },
      })
    )
  );

  console.log(`  Created ${links.length} platform links`);

  // ---------------------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------------------
  const professionalCard = await prisma.card.create({
    data: {
      userId: testUser.id,
      title: 'Professional',
      description: 'My professional links for work and networking.',
      slug: 'devcard-demo-professional',
      visibility: CardVisibility.PUBLIC,
      qrEnabled: true,
      isDefault: true,
      cardLinks: {
        create: [
          { platformLinkId: links[0].id, displayOrder: 0 }, // GitHub
          { platformLinkId: links[1].id, displayOrder: 1 }, // LinkedIn
          { platformLinkId: links[2].id, displayOrder: 2 }, // Twitter
          { platformLinkId: links[4].id, displayOrder: 3 }, // Portfolio
        ],
      },
    },
  });

  const hackathonCard = await prisma.card.create({
    data: {
      userId: testUser.id,
      title: 'Hackathon',
      description: 'Find me at hackathons and dev events.',
      slug: 'devcard-demo-hackathon',
      visibility: CardVisibility.UNLISTED,
      qrEnabled: true,
      isDefault: false,
      cardLinks: {
        create: [
          { platformLinkId: links[0].id, displayOrder: 0 }, // GitHub
          { platformLinkId: links[3].id, displayOrder: 1 }, // Devfolio
          { platformLinkId: links[6].id, displayOrder: 2 }, // Discord
          { platformLinkId: links[2].id, displayOrder: 3 }, // Twitter
        ],
      },
    },
  });

  console.log(`  Created cards: "${professionalCard.title}", "${hackathonCard.title}"`);

  // ---------------------------------------------------------------------------
  // Event + attendee
  // ---------------------------------------------------------------------------
  const event = await prisma.event.create({
    data: {
      name: 'DevCard Launch Hackathon',
      slug: 'devcard-launch-hackathon',
      location: 'San Francisco, CA',
      description: 'A weekend hackathon to celebrate the DevCard launch.',
      organizerId: testUser.id,
      startDate: new Date('2026-07-01T09:00:00Z'),
      endDate: new Date('2026-07-03T18:00:00Z'),
      isPublic: true,
      attendees: {
        create: {
          userId: testUser.id,
          joinedAt: new Date('2026-06-15T12:00:00Z'),
        },
      },
    },
  });

  console.log(`  Created event: "${event.name}"`);

  // ---------------------------------------------------------------------------
  // Team + membership
  // ---------------------------------------------------------------------------
  const team = await prisma.team.create({
    data: {
      name: 'OpenSource Inc.',
      slug: 'opensource-inc',
      description: 'The team behind DevCard.',
      avatarUrl: null,
      ownerId: testUser.id,
      members: {
        create: {
          userId: testUser.id,
          role: TeamRole.OWNER,
          joinedAt: new Date('2026-06-10T08:00:00Z'),
        },
      },
    },
  });

  console.log(`  Created team: "${team.name}"`);

  console.log('\nSeed complete! Try: GET /api/u/devcard-demo');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    return; 
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
