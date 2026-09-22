import { personasDelEquipo } from '../components/EquipoTrabajo';
import { partesFecha } from '../components/JornadasCalendario';

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
