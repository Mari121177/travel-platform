import {
  durationMinutes,
  infantFare,
  localDateToUtcRange,
  seatsNeeded,
  sortResults,
  totalFare,
  validateSearchCriteria,
} from './search.utils';

describe('localDateToUtcRange (FLT-11)', () => {
  it('Cairo winter day (UTC+2) starts at 22:00 UTC the day before', () => {
    const { start, end } = localDateToUtcRange('2026-01-15', 'Africa/Cairo');
    expect(start.toISOString()).toBe('2026-01-14T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-01-15T22:00:00.000Z');
  });

  it('Dubai (UTC+4, no daylight saving)', () => {
    const { start, end } = localDateToUtcRange('2026-07-01', 'Asia/Dubai');
    expect(start.toISOString()).toBe('2026-06-30T20:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-01T20:00:00.000Z');
  });

  it('New York summer day (UTC-4)', () => {
    const { start } = localDateToUtcRange('2026-07-01', 'America/New_York');
    expect(start.toISOString()).toBe('2026-07-01T04:00:00.000Z');
  });

  it('a day with spring-forward is 23 hours long', () => {
    const { start, end } = localDateToUtcRange(
      '2026-03-08',
      'America/New_York',
    );
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });

  it('a day with fall-back is 25 hours long', () => {
    const { start, end } = localDateToUtcRange(
      '2026-11-01',
      'America/New_York',
    );
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });

  it('handles month and year rollover', () => {
    const { end } = localDateToUtcRange('2026-12-31', 'UTC');
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('rejects a malformed date', () => {
    expect(() => localDateToUtcRange('15-01-2026', 'UTC')).toThrow();
  });
});

describe('passenger rules (FLT-12)', () => {
  it('infants take no seat', () => {
    expect(seatsNeeded({ adults: 2, children: 1, infants: 1 })).toBe(3);
  });

  it('infant pays 10% of the fare', () => {
    expect(infantFare(200)).toBe(20);
    expect(infantFare(99.99)).toBe(10);
  });

  it('total fare adds adults, children and infants', () => {
    // 2 adults + 1 child at 100 = 300, 1 infant at 10 = 10
    expect(totalFare(100, { adults: 2, children: 1, infants: 1 })).toBe(310);
  });
});

describe('validateSearchCriteria', () => {
  const valid = {
    origin: 'CAI',
    destination: 'DXB',
    departureDate: '2026-12-20',
    adults: 1,
    children: 0,
    infants: 0,
  };

  it('accepts a valid one-way search', () => {
    expect(validateSearchCriteria(valid)).toEqual([]);
  });

  it('rejects identical airports', () => {
    expect(
      validateSearchCriteria({ ...valid, destination: 'CAI' }),
    ).toHaveLength(1);
  });

  it('rejects infants outnumbering adults', () => {
    expect(validateSearchCriteria({ ...valid, infants: 2 })).toContain(
      'infants cannot outnumber adults',
    );
  });

  it('accepts as many infants as adults', () => {
    expect(validateSearchCriteria({ ...valid, adults: 2, infants: 2 })).toEqual(
      [],
    );
  });

  it('rejects no adults', () => {
    expect(validateSearchCriteria({ ...valid, adults: 0 })).toContain(
      'at least one adult is required',
    );
  });

  it('rejects a return date before departure but allows the same day', () => {
    expect(
      validateSearchCriteria({ ...valid, returnDate: '2026-12-19' }),
    ).toHaveLength(1);
    expect(
      validateSearchCriteria({ ...valid, returnDate: '2026-12-20' }),
    ).toEqual([]);
  });

  it('rejects min price above max price, allows equal', () => {
    expect(
      validateSearchCriteria({ ...valid, minPrice: 500, maxPrice: 100 }),
    ).toHaveLength(1);
    expect(
      validateSearchCriteria({ ...valid, minPrice: 100, maxPrice: 100 }),
    ).toEqual([]);
  });
});

describe('duration and sorting (FLT-15)', () => {
  it('duration is computed from UTC instants', () => {
    expect(
      durationMinutes(
        new Date('2026-12-20T08:00:00Z'),
        new Date('2026-12-20T11:30:00Z'),
      ),
    ).toBe(210);
  });

  const items = [
    {
      id: 'a',
      price: 300,
      durationMinutes: 120,
      departureTime: new Date('2026-12-20T10:00:00Z'),
    },
    {
      id: 'b',
      price: 100,
      durationMinutes: 300,
      departureTime: new Date('2026-12-20T06:00:00Z'),
    },
    {
      id: 'c',
      price: 200,
      durationMinutes: 60,
      departureTime: new Date('2026-12-20T20:00:00Z'),
    },
  ];

  it.each([
    ['price', 'asc', ['b', 'c', 'a']],
    ['price', 'desc', ['a', 'c', 'b']],
    ['duration', 'asc', ['c', 'a', 'b']],
    ['departureTime', 'asc', ['b', 'a', 'c']],
  ] as const)('sorts by %s %s', (field, order, expected) => {
    expect(sortResults(items, field, order).map((i) => i.id)).toEqual(expected);
  });

  it('does not change the original array', () => {
    const copy = [...items];
    sortResults(items, 'price');
    expect(items).toEqual(copy);
  });
});