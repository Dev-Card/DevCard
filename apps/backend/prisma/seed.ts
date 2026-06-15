import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database.......');

  const user = await prisma.user.upsert({
    where: {
      username: 'devcard-demo',
    },
    update: {},
    create: {
      email: 'demo@devcard.dev',
      username: 'devcard-demo',
      displayName: 'Alex Chen',
      bio: 'Full-stack developer • Open source enthusiast • Builder of things',
      pronouns: 'they/them',
      role: 'Senior Software Engineer',
      company: 'OpenSource Inc.',
      accentColor: '#6366f1',
      isActive: true,
      emailVerified: true,

      identities: {
        create: {
          provider: 'github',
          providerId: 'demo-12345',
        },
      },
    },
  });

  console.log(`User created: ${user.username}`);

  await prisma.cardLink.deleteMany({});
  await prisma.card.deleteMany({});
  await prisma.platformLink.deleteMany({
    where: {
      userId: user.id,
    },
  });

  const links = await Promise.all([
    prisma.platformLink.create({
      data: {
        userId: user.id,
        platform: 'github',
        username: 'alexchen',
        url: 'https://github.com/alexchen',
        displayOrder: 0,
      },
    }),

    prisma.platformLink.create({
      data: {
        userId: user.id,
        platform: 'linkedin',
        username: 'alexchen-dev',
        url: 'https://linkedin.com/in/alexchen-dev',
        displayOrder: 1,
      },
    }),

    prisma.platformLink.create({
      data: {
        userId: user.id,
        platform: 'twitter',
        username: 'alexchendev',
        url: 'https://x.com/alexchendev',
        displayOrder: 2,
      },
    }),

    prisma.platformLink.create({
      data: {
        userId: user.id,
        platform: 'portfolio',
        username: 'alexchen.dev',
        url: 'https://alexchen.dev',
        displayOrder: 3,
      },
    }),

    prisma.platformLink.create({
      data: {
        userId: user.id,
        platform: 'devfolio',
        username: 'alexchen',
        url: 'https://devfolio.co/@alexchen',
        displayOrder: 4,
      },
    }),

    prisma.platformLink.create({
      data: {
        userId: user.id,
        platform: 'leetcode',
        username: 'alexchen',
        url: 'https://leetcode.com/u/alexchen',
        displayOrder: 5,
      },
    }),

    prisma.platformLink.create({
      data: {
        userId: user.id,
        platform: 'discord',
        username: 'alexchen#4242',
        url: '',
        displayOrder: 6,
      },
    }),

    prisma.platformLink.create({
      data: {
        userId: user.id,
        platform: 'email',
        username: 'alex@devcard.dev',
        url: 'mailto:alex@devcard.dev',
        displayOrder: 7,
      },
    }),
  ]);

  console.log(`${links.length} platform links created`);

  const professionalCard = await prisma.card.create({
    data: {
      userId: user.id,
      title: 'Professional',
      isDefault: true,

      cardLinks: {
        create: [
          {
            platformLinkId: links[0].id,
            displayOrder: 0,
          },
          {
            platformLinkId: links[1].id,
            displayOrder: 1,
          },
          {
            platformLinkId: links[2].id,
            displayOrder: 2,
          },
          {
            platformLinkId: links[3].id,
            displayOrder: 3,
          },
        ],
      },
    },
  });

  const hackathonCard = await prisma.card.create({
    data: {
      userId: user.id,
      title: 'Hackathon',

      cardLinks: {
        create: [
          {
            platformLinkId: links[0].id,
            displayOrder: 0,
          },
          {
            platformLinkId: links[4].id,
            displayOrder: 1,
          },
          {
            platformLinkId: links[6].id,
            displayOrder: 2,
          },
          {
            platformLinkId: links[2].id,
            displayOrder: 3,
          },
        ],
      },
    },
  });

  console.log(
    `Cards created: ${professionalCard.title}, ${hackathonCard.title}`,
  );

  console.log('\nSeed complete');
}

main()
  .catch((err) => {
    console.error('Seed failed', err);
    return; 
  })
  .finally(async () => {
    await prisma.$disconnect();
  });