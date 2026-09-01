import {
  dateToFechaISO,
  dateToHoraISO,
  parseFechaToDate,
  parseHoraToDate,
} from '../fecha';

describe('parseFechaToDate / dateToFechaISO', () => {
  it('round-trip de una fecha válida', () => {
    const date = parseFechaToDate('2026-08-27');
    expect(date).not.toBeNull();
    expect(dateToFechaISO(date!)).toBe('2026-08-27');
  });

  it('rechaza fechas inválidas', () => {
    expect(parseFechaToDate('20/08/2026')).toBeNull();
    expect(parseFechaToDate('2026-02-31')).toBeNull();
    expect(parseFechaToDate('')).toBeNull();
  });
});

describe('parseHoraToDate / dateToHoraISO', () => {
  it('round-trip de una hora válida', () => {
    const date = parseHoraToDate('14:30');
    expect(date).not.toBeNull();
    expect(dateToHoraISO(date!)).toBe('14:30');
  });

  it('rechaza horas inválidas', () => {
    expect(parseHoraToDate('25:00')).toBeNull();
    expect(parseHoraToDate('14:30:00')).toBeNull();
  });
});
