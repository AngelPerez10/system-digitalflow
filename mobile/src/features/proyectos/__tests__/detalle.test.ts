import { jornadasDelProyecto, partesFecha, personasDelEquipo } from '../proyectoFormat';

describe('personasDelEquipo', () => {
  it('responsable primero, luego técnicos y auxiliares, con su foto', () => {
    const personas = personasDelEquipo({
      tecnicos: [
        { id: 1, nombre: 'Ana Ruiz', responsable: false, avatar_url: '' },
        { id: 2, nombre: 'Luis Díaz', responsable: true, avatar_url: 'https://cdn/luis.jpg' },
      ],
      auxiliares: [{ id: 3, nombre: '  Eva Paz ', avatar_url: null }],
    });
    expect(personas.map((p) => [p.nombre, p.rol, p.avatar])).toEqual([
      ['Luis Díaz', 'responsable', 'https://cdn/luis.jpg'],
      ['Ana Ruiz', 'tecnico', null],
      ['Eva Paz', 'auxiliar', null],
    ]);
  });

  it('sin avatar_url (backend viejo) cae a iniciales', () => {
    const [p] = personasDelEquipo({ tecnicos: [{ id: 1, nombre: 'Ana', responsable: true }], auxiliares: [] });
    expect(p?.avatar).toBeNull();
  });
});

describe('partesFecha', () => {
  it('día de la semana, número y mes sin corrimiento de zona horaria', () => {
    expect(partesFecha('2026-09-22')).toEqual({ dia: 'Mar', numero: 22, mes: 'sep' });
    expect(partesFecha('2026-01-01T00:00:00')).toEqual({ dia: 'Jue', numero: 1, mes: 'ene' });
  });

  it('null si no es fecha', () => {
    expect(partesFecha('mañana')).toBeNull();
  });
});

describe('jornadasDelProyecto', () => {
  const nota = (texto: string) => ({ id: texto || 'v', nota: texto, imagenesUrls: [] as string[] });

  it('ordena, quita repetidas y marca hechas / hoy / próximas con su bitácora', () => {
    const r = jornadasDelProyecto(
      {
        fechas_inicio: ['2026-10-05', '2026-10-02', '2026-10-02', '2026-10-01T09:00:00'],
        notas_por_dia: [nota('Se cableó'), nota(''), nota('Pruebas')],
      },
      '2026-10-02',
    );
    expect(r.jornadas.map((j) => [j.iso, j.estado, j.conBitacora])).toEqual([
      ['2026-10-01', 'hecha', true],
      ['2026-10-02', 'hoy', false],
      ['2026-10-05', 'proxima', true],
    ]);
    expect(r.hechas).toBe(2);
    expect(r.indiceHoy).toBe(1);
    expect(r.siguiente?.iso).toBe('2026-10-05');
  });

  it('sin jornadas hoy ni próximas', () => {
    const r = jornadasDelProyecto({ fechas_inicio: ['2026-09-01'], notas_por_dia: [] }, '2026-10-02');
    expect(r.indiceHoy).toBeNull();
    expect(r.siguiente).toBeNull();
    expect(r.hechas).toBe(1);
  });
});
