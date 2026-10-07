import {
  describirFecha,
  diasProximos,
  franjaDelDia,
  horaAMinutos,
  horaDeMarca,
  marcaDeHora,
  primerNombre,
  REGLA_MARCAS,
  relativoDias,
} from '../agendaFechas';

const HOY = new Date(2026, 9, 6); // martes 6 de octubre de 2026

describe('diasProximos', () => {
  it('arranca hoy y cruza de mes', () => {
    const dias = diasProximos(30, HOY);
    expect(dias[0]).toEqual({ iso: '2026-10-06', etiqueta: 'Hoy', dia: 6, mesCorto: 'oct', esHoy: true });
    expect(dias[1]?.etiqueta).toBe('Mié');
    expect(dias[26]).toMatchObject({ iso: '2026-11-01', dia: 1, mesCorto: 'nov', esHoy: false });
  });
});

describe('describirFecha', () => {
  it('describe mañana', () => {
    expect(describirFecha('2026-10-07', HOY)).toEqual({
      diaSemana: 'Miércoles',
      fecha: '7 de octubre',
      relativo: 'Mañana',
      dia: 7,
      mesCorto: 'oct',
    });
  });

  it('agrega el año solo si no es el actual', () => {
    expect(describirFecha('2027-01-04', HOY)?.fecha).toBe('4 de enero de 2027');
  });

  it('fechas pasadas y lejanas', () => {
    expect(describirFecha('2026-10-04', HOY)?.relativo).toBe('Hace 2 días');
    expect(describirFecha('2026-10-16', HOY)?.relativo).toBe('En 10 días');
  });

  it('null si la fecha no es válida', () => {
    expect(describirFecha('2026-02-30', HOY)).toBeNull();
    expect(describirFecha('', HOY)).toBeNull();
  });
});

describe('relativoDias / primerNombre', () => {
  it('textos cortos', () => {
    expect(relativoDias(0)).toBe('Hoy');
    expect(relativoDias(-1)).toBe('Ayer');
    expect(primerNombre('  Ana  López ')).toBe('Ana');
  });
});

describe('regla de hora', () => {
  it('convierte entre hora y marca', () => {
    expect(REGLA_MARCAS).toBe(61);
    expect(horaDeMarca(0)).toBe('06:00');
    expect(horaDeMarca(REGLA_MARCAS - 1)).toBe('21:00');
    expect(marcaDeHora('10:30')).toBe(18);
    expect(horaDeMarca(marcaDeHora('10:30') ?? -1)).toBe('10:30');
  });

  it('redondea al paso de 15 y se pega a los bordes', () => {
    expect(horaDeMarca(marcaDeHora('10:38') ?? -1)).toBe('10:45');
    expect(marcaDeHora('05:00')).toBe(0);
    expect(marcaDeHora('23:30')).toBe(REGLA_MARCAS - 1);
    expect(marcaDeHora('')).toBeNull();
  });

  it('acepta segundos del backend y nombra la franja', () => {
    expect(horaAMinutos('14:30:00')).toBe(870);
    expect(franjaDelDia('09:00')).toBe('Por la mañana');
    expect(franjaDelDia('13:15')).toBe('Al mediodía');
    expect(franjaDelDia('17:00')).toBe('Por la tarde');
    expect(franjaDelDia('20:00')).toBe('Por la noche');
  });
});
