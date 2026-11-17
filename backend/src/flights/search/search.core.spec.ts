import { buildLegPage } from './search.core';
import { CabinClass } from './search.constants';
import type {
  AirportInfo,
  LegCriteria,
  SearchableCabin,
  SearchableFlight,
} from './search.types';

const airports = new Map<string, AirportInfo>([
  ['CAI', { iataCode: 'CAI', name: 'Cairo', timeZone: 'Africa/Cairo' }],
  ['DXB', { iataCode: 'DXB', name: 'Dubai', timeZone: 'Asia/Dubai' }],
]);

const cabin = (over: Partial<SearchableCabin> = {}): SearchableCabin => ({
  cabin: CabinClass.ECONOMY,
  fare: 100,
  totalSeats: 10,
  bookedSeats: 0,
  heldSeats: 0,
  ...over,
});

let counter = 0;
const flight = (over: Partial<SearchableFlight> = {}): SearchableFlight => ({
  id: `f${++counter}`,
  flightNumber: `MS${100 + counter}`,
  airline: { id: 'a1', name: 'EgyptAir', isActive: true },
  originCode: 'CAI',
  destinationCode: 'DXB',
  departureTime: new Date('2026-12-20T08:00:00Z'),
  arrivalTime: new Date('2026-12-20T11:30:00Z'),
  cabins: [cabin()],
  ...over,
});

const criteria = (over: Partial<LegCriteria> = {}): LegCriteria => ({
  adults: 1,
  children: 0,
  infants: 0,
  sortBy: 'price',
  order: 'asc',
  page: 1,
  ...over,
});

const ids = (flights: SearchableFlight[], c: LegCriteria) =>
  buildLegPage(flights, airports, c).data.map((r) => r.id);

describe('buildLegPage: which flights are shown (FLT-11)', () => {
  it('hides flights of a deactivated airline', () => {
    const hidden = flight({
      airline: { id: 'a2', name: 'X', isActive: false },
    });
    const shown = flight();
    expect(ids([hidden, shown], criteria())).toEqual([shown.id]);
  });

  it('counts booked and held seats as taken', () => {
    const full = flight({
      cabins: [cabin({ totalSeats: 5, bookedSeats: 3, heldSeats: 2 })],
    });
    expect(ids([full], criteria())).toEqual([]);
  });

  it('shows a flight when the free seats exactly fit the party', () => {
    const f = flight({
      cabins: [cabin({ totalSeats: 5, bookedSeats: 1, heldSeats: 1 })],
    });
    expect(ids([f], criteria({ adults: 2, children: 1 }))).toEqual([f.id]);
    expect(ids([f], criteria({ adults: 2, children: 2 }))).toEqual([]);
  });

  it('infants do not need a seat', () => {
    const f = flight({ cabins: [cabin({ totalSeats: 2 })] });
    expect(ids([f], criteria({ adults: 2, infants: 2 }))).toEqual([f.id]);
  });

  it('returns an empty page when nothing matches', () => {
    expect(buildLegPage([], airports, criteria())).toMatchObject({
      data: [],
      total: 0,
      totalPages: 0,
      pageSize: 10,
    });
  });
});

describe('buildLegPage: cabin and price rule (FLT-12, FLT-15)', () => {
  const mixed = flight({
    cabins: [
      cabin({ cabin: CabinClass.ECONOMY, fare: 100, totalSeats: 1 }),
      cabin({ cabin: CabinClass.BUSINESS, fare: 300 }),
    ],
  });

  it('uses the cheapest cabin that has enough seats', () => {
    // Economy has 1 seat, so a party of 2 is priced from Business
    const r = buildLegPage([mixed], airports, criteria({ adults: 2 })).data[0];
    expect(r.price).toBe(300);
    expect(r.cabins.map((o) => o.cabin)).toEqual([CabinClass.BUSINESS]);
  });

  it('uses the cheapest cabin when everything fits', () => {
    const r = buildLegPage([mixed], airports, criteria()).data[0];
    expect(r.price).toBe(100);
    expect(r.cabins.map((o) => o.cabin)).toEqual([
      CabinClass.ECONOMY,
      CabinClass.BUSINESS,
    ]);
  });

  it('uses only the chosen cabin when a cabin filter is given', () => {
    const r = buildLegPage(
      [mixed],
      airports,
      criteria({ cabin: CabinClass.BUSINESS }),
    ).data[0];
    expect(r.price).toBe(300);
    expect(r.cabins).toHaveLength(1);
  });

  it('hides a flight without the chosen cabin', () => {
    expect(ids([mixed], criteria({ cabin: CabinClass.FIRST }))).toEqual([]);
  });

  it('shows the party total separately from the per-person fare', () => {
    const f = flight({ cabins: [cabin({ fare: 100 })] });
    const r = buildLegPage(
      [f],
      airports,
      criteria({ adults: 2, children: 1, infants: 1 }),
    ).data[0];
    expect(r.price).toBe(100);
    expect(r.cabins[0].totalPrice).toBe(310);
  });

  it('price filter is inclusive on both ends', () => {
    const cheap = flight({ cabins: [cabin({ fare: 100 })] });
    const mid = flight({ cabins: [cabin({ fare: 200 })] });
    const dear = flight({ cabins: [cabin({ fare: 300 })] });
    const all = [cheap, mid, dear];
    expect(ids(all, criteria({ minPrice: 100, maxPrice: 200 }))).toEqual([
      cheap.id,
      mid.id,
    ]);
    expect(ids(all, criteria({ minPrice: 201 }))).toEqual([dear.id]);
    expect(ids(all, criteria({ maxPrice: 99 }))).toEqual([]);
  });
});

describe('buildLegPage: sorting and paging (FLT-15, GEN-05)', () => {
  const a = flight({
    cabins: [cabin({ fare: 300 })],
    departureTime: new Date('2026-12-20T10:00:00Z'),
    arrivalTime: new Date('2026-12-20T12:00:00Z'),
  });
  const b = flight({
    cabins: [cabin({ fare: 100 })],
    departureTime: new Date('2026-12-20T06:00:00Z'),
    arrivalTime: new Date('2026-12-20T11:00:00Z'),
  });
  const c = flight({
    cabins: [cabin({ fare: 200 })],
    departureTime: new Date('2026-12-20T20:00:00Z'),
    arrivalTime: new Date('2026-12-20T21:00:00Z'),
  });

  it.each([
    ['price', 'asc', [b.id, c.id, a.id]],
    ['price', 'desc', [a.id, c.id, b.id]],
    ['duration', 'asc', [c.id, a.id, b.id]],
    ['departureTime', 'asc', [b.id, a.id, c.id]],
  ] as const)('sorts by %s %s', (sortBy, order, expected) => {
    expect(ids([a, b, c], criteria({ sortBy, order }))).toEqual(expected);
  });

  it('pages are always 10 results', () => {
    const many = Array.from({ length: 12 }, () => flight());
    const first = buildLegPage(many, airports, criteria({ page: 1 }));
    const second = buildLegPage(many, airports, criteria({ page: 2 }));
    expect(first.data).toHaveLength(10);
    expect(second.data).toHaveLength(2);
    expect(first).toMatchObject({ total: 12, pageSize: 10, totalPages: 2 });
    expect(buildLegPage(many, airports, criteria({ page: 3 })).data).toEqual(
      [],
    );
  });
});

describe('buildLegPage: result details (GEN-06)', () => {
  it('shows local times with offsets and the duration', () => {
    const r = buildLegPage([flight()], airports, criteria()).data[0];
    expect(r.departureLocal).toBe('2026-12-20T10:00:00+02:00');
    expect(r.arrivalLocal).toBe('2026-12-20T15:30:00+04:00');
    expect(r.durationMinutes).toBe(210);
    expect(r.departureTime).toBe('2026-12-20T08:00:00.000Z');
    expect(r.origin.timeZone).toBe('Africa/Cairo');
  });
});