import { evaluarContrasena, LARGO_COMODO, MIN_LARGO } from '../passwordPolicy';

describe('evaluarContrasena', () => {
  it('marca la base incompleta con una contraseña corta', () => {
    const r = evaluarContrasena('abc', { confirmar: 'abc' });
    expect(r.faltantesRequeridos).toBeGreaterThan(0);
    expect(r.listoParaEnviar).toBe(false);
    expect(r.nivel).toBeLessThanOrEqual(1);
  });

  it('exige mezcla de letras y números', () => {
    const soloLetras = evaluarContrasena('abcdefghij', { confirmar: 'abcdefghij' });
    expect(soloLetras.requisitos.find((x) => x.id === 'mezcla')?.cumplido).toBe(false);
    expect(soloLetras.listoParaEnviar).toBe(false);
  });

  it('acepta una contraseña con la base cubierta y confirmación igual', () => {
    const clave = 'perico2024';
    const r = evaluarContrasena(clave, { confirmar: clave });
    expect(r.faltantesRequeridos).toBe(0);
    expect(r.listoParaEnviar).toBe(true);
    expect(r.nivel).toBeGreaterThanOrEqual(2);
  });

  it('no está lista si las contraseñas no coinciden', () => {
    const r = evaluarContrasena('perico2024', { confirmar: 'otra9999' });
    expect(r.listoParaEnviar).toBe(false);
  });

  it('rechaza palabras y secuencias obvias', () => {
    for (const mala of ['password123', 'Contraseña1', '123456789a', 'sertelpro7']) {
      const r = evaluarContrasena(mala, { confirmar: mala });
      expect(r.requisitos.find((x) => x.id === 'obvia')?.cumplido).toBe(false);
      expect(r.listoParaEnviar).toBe(false);
    }
  });

  it('rechaza reutilizar la contraseña temporal', () => {
    const temp = 'Temp-9f3k2h';
    const r = evaluarContrasena(temp, { confirmar: temp, tempPassword: temp });
    expect(r.requisitos.find((x) => x.id === 'temp')?.cumplido).toBe(false);
    expect(r.listoParaEnviar).toBe(false);
  });

  it('sube el nivel con largo cómodo, casing y símbolo, sin bloquear', () => {
    const fuerte = 'Rio-Verde-88-nube';
    const r = evaluarContrasena(fuerte, { confirmar: fuerte });
    expect(fuerte.length).toBeGreaterThanOrEqual(LARGO_COMODO);
    expect(r.listoParaEnviar).toBe(true);
    expect(r.nivel).toBe(4);
    expect(r.etiqueta).toBe('Muy fuerte');
    // Las sugerencias no son obligatorias.
    expect(r.requisitos.filter((x) => !x.requerido).every((x) => x.requerido === false)).toBe(true);
  });

  it('el nivel es 0 y no lista con la contraseña vacía', () => {
    const r = evaluarContrasena('', {});
    expect(r.nivel).toBe(0);
    expect(r.listoParaEnviar).toBe(false);
  });

  it('la base mínima aceptable son exactamente MIN_LARGO caracteres con mezcla', () => {
    const clave = 'a'.repeat(MIN_LARGO - 1) + '1';
    expect(clave.length).toBe(MIN_LARGO);
    const r = evaluarContrasena(clave, { confirmar: clave });
    expect(r.requisitos.find((x) => x.id === 'largo')?.cumplido).toBe(true);
  });
});
