import 'dotenv/config';
import bcrypt from 'bcrypt';
import { BookingStatus, PriceType, UserRole } from '../src/generated/prisma/client';
import { prisma } from '../src/server/db';
import { refreshProviderRating } from '../src/server/services/bookings';

// Idempotent: every row has a stable id or unique key, so re-running updates instead of duplicating.

type Slug = 'mechanic' | 'cleaning' | 'electrician' | 'plumber' | 'painter' | 'carpenter';

const categories: [Slug, string, string][] = [
  ['mechanic', 'Mechanic', 'Wrench'], ['cleaning', 'Cleaner', 'Sparkles'],
  ['electrician', 'Electrician', 'Zap'], ['plumber', 'Plumber', 'Droplet'],
  ['painter', 'Painter', 'Paintbrush'], ['carpenter', 'Carpenter', 'Hammer'],
];

// [title, description, price TND, priceType, durationMin]
const catalog: Record<Slug, [string, string, number, PriceType, number][]> = {
  mechanic: [
    ['Oil and filter change', 'Engine oil, oil filter and a 20-point check at your home or office.', 90, 'FIXED', 60],
    ['Battery replacement', 'Diagnosis and fitting of a new battery (battery price not included).', 35, 'FIXED', 45],
    ['Breakdown diagnosis', 'On-site electronic diagnosis. Repair quoted after inspection.', 60, 'ESTIMATE', 60],
  ],
  cleaning: [
    ['Apartment deep cleaning', 'Full cleaning of an S+2 apartment: kitchen, bathrooms, floors and windows.', 120, 'FIXED', 240],
    ['Hourly home cleaning', 'Regular cleaning with your products or ours.', 15, 'HOURLY', 180],
    ['Post-renovation cleaning', 'Dust, paint and plaster removal after works.', 250, 'ESTIMATE', 360],
  ],
  electrician: [
    ['Electrical fault repair', 'Find and fix tripping breakers, dead sockets and short circuits.', 40, 'HOURLY', 60],
    ['Light fixture installation', 'Install ceiling lights, spotlights or chandeliers.', 30, 'FIXED', 45],
    ['Panel upgrade', 'Replace or extend a distribution board to current standards.', 350, 'ESTIMATE', 240],
  ],
  plumber: [
    ['Leak repair', 'Locate and repair leaking pipes, taps and fittings.', 50, 'FIXED', 60],
    ['Water heater installation', 'Install or replace a gas or electric water heater.', 80, 'FIXED', 120],
    ['Drain unblocking', 'Unblock sinks, showers and toilets.', 35, 'HOURLY', 60],
  ],
  painter: [
    ['Room painting', 'Two coats on walls and ceiling of a standard room, preparation included.', 280, 'FIXED', 480],
    ['Facade painting', 'Exterior painting with weather-resistant paint.', 900, 'ESTIMATE', 960],
    ['Touch-ups and repairs', 'Crack filling and paint touch-ups.', 25, 'HOURLY', 120],
  ],
  carpenter: [
    ['Door repair and adjustment', 'Fix sagging doors, hinges and locks.', 45, 'FIXED', 60],
    ['Custom kitchen cabinets', 'Design and build made-to-measure cabinets.', 1500, 'ESTIMATE', 480],
    ['Furniture assembly', 'Assembly of flat-pack furniture.', 20, 'HOURLY', 120],
  ],
};

// [userId, name, email, category, neighbourhood, lat, lng, experienceYears]
const providers: [string, string, string, Slug, string, number, number, number][] = [
  ['provider_demo', 'Youssef Trabelsi', 'provider@proxiservice.tn', 'plumber', 'Ben Arous', 36.7531, 10.2189, 9],
  ['prov_02', 'Karim Ben Salem', 'karim.bensalem@proxiservice.tn', 'mechanic', 'Tunis Centre', 36.8008, 10.1800, 12],
  ['prov_03', 'Amira Gharbi', 'amira.gharbi@proxiservice.tn', 'cleaning', 'Ariana Ville', 36.8625, 10.1956, 5],
  ['prov_04', 'Fares Ben Amor', 'fares.benamor@proxiservice.tn', 'electrician', 'Le Bardo', 36.8092, 10.1342, 11],
  ['prov_05', 'Nour Ben Youssef', 'nour.benyoussef@proxiservice.tn', 'painter', 'Raoued', 36.9356, 10.1836, 6],
  ['prov_06', 'Hichem Bouazizi', 'hichem.bouazizi@proxiservice.tn', 'carpenter', 'Ennasr', 36.8597, 10.1650, 15],
  ['prov_07', 'Sana Jaziri', 'sana.jaziri@proxiservice.tn', 'plumber', 'El Mourouj', 36.7333, 10.2083, 8],
  ['prov_08', 'Omar Khelifi', 'omar.khelifi@proxiservice.tn', 'mechanic', 'La Marsa', 36.8782, 10.3247, 10],
  ['prov_09', 'Meriem Dridi', 'meriem.dridi@proxiservice.tn', 'cleaning', 'El Menzah 6', 36.8441, 10.1752, 4],
  ['prov_10', 'Bilel Saidi', 'bilel.saidi@proxiservice.tn', 'electrician', 'Les Berges du Lac 1', 36.8327, 10.2380, 9],
  ['prov_11', 'Rania Mansour', 'rania.mansour@proxiservice.tn', 'painter', 'Manouba', 36.8101, 10.0956, 7],
  ['prov_12', 'Sami Ben Fredj', 'sami.benfredj@proxiservice.tn', 'carpenter', 'Mutuelleville', 36.8236, 10.1689, 13],
  ['prov_13', 'Walid Ayari', 'walid.ayari@proxiservice.tn', 'plumber', 'La Soukra', 36.8742, 10.2481, 5],
  ['prov_14', 'Ines Chatti', 'ines.chatti@proxiservice.tn', 'mechanic', 'Megrine', 36.7686, 10.2339, 8],
  ['prov_15', 'Aymen Jlassi', 'aymen.jlassi@proxiservice.tn', 'cleaning', 'Carthage', 36.8528, 10.3233, 6],
  ['prov_16', 'Salma Karray', 'salma.karray@proxiservice.tn', 'electrician', 'Lafayette', 36.8169, 10.1842, 7],
  ['prov_17', 'Tarek Ben Mabrouk', 'tarek.benmabrouk@proxiservice.tn', 'painter', 'Rades', 36.7681, 10.2753, 14],
  ['prov_18', 'Mouna Khemiri', 'mouna.khemiri@proxiservice.tn', 'carpenter', 'Denden', 36.8053, 10.1100, 9],
  ['prov_19', 'Nabil Ben Romdhane', 'nabil.benromdhane@proxiservice.tn', 'plumber', 'El Menzah 9', 36.8481, 10.1594, 10],
  ['prov_20', 'Dorra Ben Salah', 'dorra.bensalah@proxiservice.tn', 'mechanic', 'Fouchana', 36.6992, 10.1694, 5],
  ['prov_21', 'Zied Ben Hmida', 'zied.benhmida@proxiservice.tn', 'cleaning', 'Hammam Lif', 36.7264, 10.3381, 12],
  ['prov_22', 'Eya Ben Rejeb', 'eya.benrejeb@proxiservice.tn', 'electrician', 'Sidi Bou Said', 36.8687, 10.3417, 4],
  ['prov_23', 'Mohamed Guesmi', 'mohamed.guesmi@proxiservice.tn', 'painter', 'Les Berges du Lac 2', 36.8448, 10.2730, 18],
  ['prov_24', 'Leila Ben Amor', 'leila.benamor@proxiservice.tn', 'carpenter', 'La Goulette', 36.8181, 10.3050, 6],
  ['prov_25', 'Anis Baccouche', 'anis.baccouche@proxiservice.tn', 'plumber', 'Ezzahra', 36.7439, 10.3083, 16],
];

// [userId, email, name, neighbourhood, lat, lng]
const clients: [string, string, string, string, number, number][] = [
  ['client_demo', 'client@proxiservice.tn', 'Maya Ben Ali', 'El Menzah 5', 36.8417, 10.1797],
  ['client_02', 'sarra.benaissa@proxiservice.tn', 'Sarra Ben Aissa', 'Ben Arous', 36.7547, 10.2275],
  ['client_03', 'ahmed.kammoun@proxiservice.tn', 'Ahmed Kammoun', 'La Marsa', 36.8890, 10.3200],
  ['client_04', 'ines.saidi@proxiservice.tn', 'Ines Saidi', 'Ariana Ville', 36.8665, 10.1647],
  ['client_05', 'fethi.jaziri@proxiservice.tn', 'Fethi Jaziri', 'El Mourouj', 36.7250, 10.2050],
  ['client_06', 'rim.triki@proxiservice.tn', 'Rim Triki', 'Le Bardo', 36.8110, 10.1400],
  ['client_07', 'skander.gharbi@proxiservice.tn', 'Skander Gharbi', 'Les Berges du Lac 2', 36.8470, 10.2780],
  ['client_08', 'olfa.mansour@proxiservice.tn', 'Olfa Mansour', 'Rades', 36.7700, 10.2700],
  ['client_09', 'maher.khelifi@proxiservice.tn', 'Maher Khelifi', 'Tunis Centre', 36.7990, 10.1830],
  ['client_10', 'yasmine.dridi@proxiservice.tn', 'Yasmine Dridi', 'Ennasr', 36.8570, 10.1700],
];

const comments: [number, string][] = [
  [5, 'Arrived on time, explained the problem clearly and left everything clean.'],
  [5, 'Very professional. Fair price and quick work. I recommend.'],
  [4, 'Good job overall, a little late but kept me informed.'],
  [5, 'Excellent work, solved it on the first visit.'],
  [4, 'Solid work and polite. Price was as quoted.'],
  [3, 'Job done, but it took longer than expected.'],
];

const phone = (n: number) => `+216 ${[20, 22, 25, 50, 55, 98][n % 6]} ${String(100 + ((n * 37) % 900))} ${String(100 + ((n * 53 + 100) % 900))}`;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A UTC instant for `hour`:00 Africa/Tunis (UTC+1, no DST), `offsetDays` from today. */
function tunisTime(offsetDays: number, hour: number) {
  const now = new Date();
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + offsetDays * DAY_MS;
  const date = new Date(day + (hour - 1) * 60 * 60 * 1000);
  if (date.getUTCDay() === 0) return new Date(date.getTime() + (offsetDays < 0 ? -DAY_MS : DAY_MS)); // skip Sundays
  return date;
}

async function upsertBooking(id: string, data: {
  clientId: string; providerId: string; serviceId: string; startAt: Date; status: BookingStatus;
  address: string; lat: number; lng: number; problemSummary: string; notes: string;
}) {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: data.serviceId } });
  const endAt = new Date(data.startAt.getTime() + service.durationMin * 60_000);
  const done = data.status === 'COMPLETED';
  const row = {
    ...data, endAt, price: service.price, priceType: service.priceType,
    // Timeline stamps that match the status, so /bookings/[id] shows a realistic history.
    acceptedAt: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(data.status) ? new Date(data.startAt.getTime() - DAY_MS) : null,
    startedAt: done ? data.startAt : null, completedAt: done ? endAt : null, rejectedAt: null, cancelledAt: null,
  };
  return prisma.booking.upsert({ where: { id }, update: row, create: { id, ...row } });
}

async function main() {
  const passwordHash = await bcrypt.hash('Demo1234', 12);

  const categoryIds = new Map<Slug, string>();
  for (const [slug, name, icon] of categories) {
    const category = await prisma.category.upsert({
      where: { slug }, update: { name, icon }, create: { id: `cat_${slug}`, slug, name, icon },
    });
    categoryIds.set(slug, category.id);
  }

  for (const [index, [id, email, name, area, lat, lng]] of clients.entries()) {
    const data = { name, phone: phone(index + 40), role: UserRole.CLIENT, passwordHash, lat, lng, addressLabel: `${area}, Tunis` };
    await prisma.user.upsert({ where: { id }, update: { email, ...data }, create: { id, email, ...data } });
  }

  const providerIds = new Map<string, string>();
  const serviceIds = new Map<string, string[]>();
  for (const [index, [userId, name, email, slug, area, lat, lng, years]] of providers.entries()) {
    const categoryId = categoryIds.get(slug)!;
    const categoryName = categories.find(([s]) => s === slug)![1];
    const userData = { name, phone: phone(index), role: UserRole.PROVIDER, passwordHash, lat, lng, addressLabel: `${area}, Tunis` };
    const user = await prisma.user.upsert({ where: { id: userId }, update: { email, ...userData }, create: { id: userId, email, ...userData } });

    const bio = `${categoryName} based in ${area} with ${years} years of experience. Serving clients across Greater Tunis with clear quotes and clean work.`;
    const providerData = { bio, experienceYears: years, radiusKm: 15 + (index % 4) * 5, verified: index % 5 !== 4 };
    const provider = await prisma.provider.upsert({
      where: { userId: user.id }, update: providerData, create: { id: `profile_${userId}`, userId: user.id, ...providerData },
    });
    providerIds.set(userId, provider.id);

    await prisma.providerCategory.upsert({
      where: { providerId_categoryId: { providerId: provider.id, categoryId } }, update: {},
      create: { providerId: provider.id, categoryId },
    });

    // Offer 2 or 3 of the category's services; small price variation per provider.
    const offered = catalog[slug].slice(0, 2 + (index % 2));
    const ids: string[] = [];
    for (const [n, [title, description, basePrice, priceType, durationMin]] of offered.entries()) {
      const id = `svc_${userId}_${n + 1}`;
      const price = Math.round(basePrice * (0.9 + (index % 5) * 0.05));
      const data = { providerId: provider.id, categoryId, title, description, price, priceType, durationMin, active: true };
      await prisma.service.upsert({ where: { id }, update: data, create: { id, ...data } });
      ids.push(id);
    }
    await prisma.service.updateMany({ where: { providerId: provider.id, id: { notIn: ids } }, data: { active: false } });
    serviceIds.set(userId, ids);

    const portfolioId = `portfolio_${userId}`;
    const portfolio = { providerId: provider.id, title: `${offered[0][0]} in ${area}`, description: `Recent ${categoryName.toLowerCase()} job completed for a client in ${area}.` };
    await prisma.portfolioItem.upsert({ where: { id: portfolioId }, update: portfolio, create: { id: portfolioId, ...portfolio } });

    // Mon–Fri 08:00–17:00, Saturday 08:00–13:00.
    await prisma.availability.deleteMany({ where: { providerId: provider.id } });
    await prisma.availability.createMany({ data: [1, 2, 3, 4, 5, 6].map((weekday) => ({
      providerId: provider.id, weekday, startTime: '08:00', endTime: weekday === 6 ? '13:00' : '17:00',
    })) });
  }

  // Remove rows from the earlier seed layout (reviews cascade).
  await prisma.booking.deleteMany({ where: { id: { startsWith: 'past_booking_' } } });

  // Past completed bookings with reviews: 1–3 per provider, spread over the last 90 days.
  let reviewIndex = 0;
  for (const [index, [userId]] of providers.entries()) {
    const count = 1 + (index % 3);
    for (let k = 0; k < count; k++) {
      const [clientId, , , area, lat, lng] = clients[(index + k * 3) % clients.length];
      const bookingId = `past_${userId}_${k + 1}`;
      await upsertBooking(bookingId, {
        clientId, providerId: providerIds.get(userId)!, serviceId: serviceIds.get(userId)![k % 2],
        startAt: tunisTime(-(7 + index * 3 + k * 11), 9 + (k * 2)), status: 'COMPLETED',
        address: `${area}, Tunis`, lat, lng, problemSummary: 'Completed service visit', notes: '',
      });
      const [rating, comment] = comments[reviewIndex++ % comments.length];
      await prisma.review.upsert({
        where: { bookingId }, update: { rating, comment },
        create: { bookingId, clientId, providerId: providerIds.get(userId)!, rating, comment },
      });
    }
  }

  // The demo client has one completed job still waiting for a review.
  await upsertBooking('past_client_demo_unreviewed', {
    clientId: 'client_demo', providerId: providerIds.get('prov_16')!, serviceId: serviceIds.get('prov_16')![0],
    startAt: tunisTime(-4, 14), status: 'COMPLETED', address: 'El Menzah 5, Tunis', lat: 36.8417, lng: 10.1797,
    problemSummary: 'Kitchen breaker keeps tripping', notes: 'Second floor, ring twice.',
  });
  // And one upcoming accepted booking.
  await upsertBooking('upcoming_client_demo', {
    clientId: 'client_demo', providerId: providerIds.get('prov_09')!, serviceId: serviceIds.get('prov_09')![0],
    startAt: tunisTime(5, 9), status: 'ACCEPTED', address: 'El Menzah 5, Tunis', lat: 36.8417, lng: 10.1797,
    problemSummary: 'Deep cleaning before family visit', notes: '',
  });

  // Two pending requests for the demo plumber in Ben Arous.
  const pending: [string, string, number, string, string][] = [
    ['client_02', 'svc_provider_demo_1', 2, 'Water leaking under the kitchen sink', 'The leak gets worse when the tap is on.'],
    ['client_demo', 'svc_provider_demo_2', 3, 'Water heater not producing hot water', 'Gas heater, about 8 years old.'],
  ];
  for (const [i, [clientId, serviceId, days, problemSummary, notes]] of pending.entries()) {
    const [, , , area, lat, lng] = clients.find(([id]) => id === clientId)!;
    await upsertBooking(`pending_demo_${i + 1}`, {
      clientId, providerId: providerIds.get('provider_demo')!, serviceId,
      startAt: tunisTime(days, 10 + i * 4), status: 'PENDING', address: `${area}, Tunis`, lat, lng, problemSummary, notes,
    });
  }

  // A job today for the demo plumber, so Start can be tried.
  await upsertBooking('today_demo_job', {
    clientId: 'client_03', providerId: providerIds.get('provider_demo')!, serviceId: 'svc_provider_demo_1',
    startAt: tunisTime(0, 12), status: 'ACCEPTED', address: 'La Marsa, Tunis', lat: 36.889, lng: 10.32,
    problemSummary: 'Dripping bathroom tap', notes: 'Building B, 3rd floor.',
  });

  for (const providerId of providerIds.values()) {
    await refreshProviderRating(prisma, providerId);
    const jobsDone = await prisma.booking.count({ where: { providerId, status: 'COMPLETED' } });
    await prisma.provider.update({ where: { id: providerId }, data: { jobsDone } });
  }
  console.log(`Seeded ${categories.length} categories, ${providers.length} providers, ${clients.length} clients, bookings and reviews.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
