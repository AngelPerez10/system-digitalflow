import { inicialesUsuarioDisplay, nombreUsuarioDisplay } from '../nombreUsuario';

describe('nombreUsuarioDisplay', () => {
  it('une primer nombre y apellido', () => {
    expect(
      nombreUsuarioDisplay({
        first_name: 'Juan Carlos',
        last_name: 'Pérez',
        username: 'jperez',
      }),
    ).toBe('Juan Carlos Pérez');
  });

  it('omite partes vacías', () => {
    expect(
      nombreUsuarioDisplay({ first_name: 'Ana', last_name: '  ', username: 'ana' }),
    ).toBe('Ana');
    expect(
      nombreUsuarioDisplay({ first_name: '', last_name: 'López', username: 'alopez' }),
    ).toBe('López');
  });

  it('cae a username o fallback', () => {
    expect(
      nombreUsuarioDisplay({ first_name: '', last_name: '', username: 'tecnico1' }),
    ).toBe('tecnico1');
    expect(nombreUsuarioDisplay(null)).toBe('Técnico');
    expect(nombreUsuarioDisplay(undefined, 'Invitado')).toBe('Invitado');
  });
});

describe('inicialesUsuarioDisplay', () => {
  it('toma hasta dos iniciales', () => {
    expect(inicialesUsuarioDisplay('Juan Carlos Pérez')).toBe('JC');
    expect(inicialesUsuarioDisplay('Ana')).toBe('A');
  });

  it('usa fallback si el nombre está vacío', () => {
    expect(inicialesUsuarioDisplay('   ', 'X')).toBe('X');
  });
});
