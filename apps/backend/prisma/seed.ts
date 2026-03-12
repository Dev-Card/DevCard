import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DevCard database...');

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { username: 'devcard-demo' },
    update: {},
    create: {
      email: 'demo@devcard.dev',
      username: 'devcard-demo',
      displayName: 'Alex Chen',
      bio: 'Full-stack developer • Open source enthusiast • Builder of things',
      pronouns: 'they/them',
      role: 'Senior Software Engineer',
      company: 'OpenSource Inc.',
      avatarUrl: null,
      accentColor: '#6366f1',
      provider: 'github',
      providerId: 'demo-12345',
    },
  });

  console.log(`  ✅ Created user: ${testUser.displayName} (@${testUser.username})`);

  // Create platform links
  const links = await Promise.all([
    prisma.platformLink.create({
      data: {
        userId: testUser.id,
        platform: 'github',
        username: 'alexchen',
        url: 'https://github.com/alexchen',
        displayOrder: 0,
      },
    }),
    prisma.platformLink.create({
      data: {
        userId: testUser.id,
        platform: 'linkedin',
        username: 'alexchen-dev',
        url: 'https://www.linkedin.com/in/alexchen-dev',
        displayOrder: 1,
      },
    }),
    prisma.platformLink.create({
      data: {
        userId: testUser.id,
        platform: 'twitter',
        username: 'alexchendev',
        url: 'https://x.com/alexchendev',
        displayOrder: 2,
      },
    }),
    prisma.platformLink.create({
      data: {
        userId: testUser.id,
        platform: 'devfolio',
        username: 'alexchen',
        url: 'https://devfolio.co/@alexchen',
        displayOrder: 3,
      },
    }),
    prisma.platformLink.create({
      data: {
        userId: testUser.id,
        platform: 'portfolio',
        username: 'https://alexchen.dev',
        url: 'https://alexchen.dev',
        displayOrder: 4,
      },
    }),
    prisma.platformLink.create({
      data: {
        userId: testUser.id,
        platform: 'leetcode',
        username: 'alexchen',
        url: 'https://leetcode.com/u/alexchen',
        displayOrder: 5,
      },
    }),
    prisma.platformLink.create({
      data: {
        userId: testUser.id,
        platform: 'discord',
        username: 'alexchen#4242',
        url: '',
        displayOrder: 6,
      },
    }),
    prisma.platformLink.create({
      data: {
        userId: testUser.id,
        platform: 'email',
        username: 'alex@devcard.dev',
        url: 'mailto:alex@devcard.dev',
        displayOrder: 7,
      },
    }),
  ]);

  console.log(`  ✅ Created ${links.length} platform links`);

  // Create context cards
  const professionalCard = await prisma.card.create({
    data: {
      userId: testUser.id,
      title: 'Professional',
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

  console.log(`  ✅ Created cards: "${professionalCard.title}", "${hackathonCard.title}"`);
  console.log('\n🎉 Seed complete! Try: GET /api/u/devcard-demo');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
