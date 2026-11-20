import { buildFlightDetails } from './search.details';
import type { DetailsSource } from './search.details';
import { CabinClass } from './search.constants';

const source = (over: Partial<DetailsSource> = {}): DetailsSource => ({
  flight: {
    id: 'f1',
    flightNumber: 'MS915',
    status: 'Scheduled',
    departureTime: new Date('2026-12-20T08:00:00Z'),
    arrivalTime: new Date('2026-12-20T11:30:00Z'),
  },
  airline: {
    id: 'a1',
    name: 'EgyptAir',
    code: 'MS',
    extraBagPrice: 40,
    maxExtraBags: 2,
    cancellationTiers: [
      { daysBeforeDeparture: 1, refundPercent: 25 },
      { daysBeforeDeparture: 14, refundPercent: 90 },
      { daysBeforeDeparture: 7, refundPercent: 50 },
    ],
  },
  cabins: [
    {
      cabin: CabinClass.BUSINESS,
      price: 600,
      totalSeats: 8,
      bookedSeats: 2,
      heldSeats: 1,
      freeBags: 2,
      maxBagWeightKg: 32,
    },
    {
      cabin: CabinClass.ECONOMY,
      price: 150,
      totalSeats: 100,
      bookedSeats: 40,
      heldSeats: 5,
      freeBags: 1,
      maxBagWeightKg: 23,
    },
  ],
  origin: { iataCode: 'CAI', name: 'Cairo', timeZone: 'Africa/Cairo' },
  destination: { iataCode: 'DXB', name: 'Dubai', timeZone: 'Asia/Dubai' },
  ...over,
});

describe('buildFlightDetails (FLT-17)', () => {
  it('shows local times with offsets and the duration', () => {
    const d = buildFlightDetails(source());
    expect(d.departureLocal).toBe('2026-12-20T10:00:00+02:00');
    expect(d.arrivalLocal).toBe('2026-12-20T15:30:00+04:00');
    expect(d.durationMinutes).toBe(210);
    expect(d.departureTime).toBe('2026-12-20T08:00:00.000Z');
  });

  it('lists cabins from Economy to First with seats remaining and baggage', () => {
    const d = buildFlightDetails(source());
    expect(d.cabins.map((c) => c.cabin)).toEqual([
      CabinClass.ECONOMY,
      CabinClass.BUSINESS,
    ]);
    expect(d.cabins[0]).toEqual({
      cabin: CabinClass.ECONOMY,
      price: 150,
      seatsRemaining: 55, // 100 - 40 booked - 5 held
      freeBags: 1,
      maxBagWeightKg: 23,
    });
    expect(d.cabins[1].seatsRemaining).toBe(5);
  });

  it('never shows negative seats', () => {
    const d = buildFlightDetails(
      source({
        cabins: [
          {
            cabin: CabinClass.ECONOMY,
            price: 1,
            totalSeats: 2,
            bookedSeats: 2,
            heldSeats: 1,
            freeBags: 1,
            maxBagWeightKg: 20,
          },
        ],
      }),
    );
    expect(d.cabins[0].seatsRemaining).toBe(0);
  });

  it('shows the cancellation policy, earliest tier first', () => {
    const d = buildFlightDetails(source());
    expect(d.cancellationPolicy.map((t) => t.daysBeforeDeparture)).toEqual([
      14, 7, 1,
    ]);
    expect(d.cancellationPolicy[0].refundPercent).toBe(90);
  });

  it('shows extra baggage rules and an empty policy when none is set', () => {
    const d = buildFlightDetails(
      source({
        airline: {
          id: 'a1',
          name: 'X',
          code: 'XX',
          maxExtraBags: 0,
          cancellationTiers: [],
        },
      }),
    );
    expect(d.extraBaggage).toEqual({ pricePerBag: undefined, maxExtraBags: 0 });
    expect(d.cancellationPolicy).toEqual([]);
  });

  it('keeps the flight status', () => {
    const d = buildFlightDetails(
      source({ flight: { ...source().flight, status: 'Cancelled' } }),
    );
    expect(d.status).toBe('Cancelled');
  });
});
