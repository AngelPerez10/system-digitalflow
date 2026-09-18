import { esEnlaceUbicacion } from '../abrirEnlace';

/**
 * Algunas direcciones traen un enlace de Google Maps en vez de una dirección
 * legible. `CampoUbicacion`/`OrdenCard` deciden con esto si muestran el texto
 * plano o un botón «Ver ubicación en el mapa».
 */
describe('esEnlaceUbicacion', () => {
  it('reconoce un enlace de Google Maps', () => {
    expect(esEnlaceUbicacion('https://www.google.com/maps?q=19.05,-104.23')).toBe(true);
  });

  it('reconoce http sin s', () => {
    expect(esEnlaceUbicacion('http://maps.google.com/?q=0,0')).toBe(true);
  });

  it('tolera espacios alrededor', () => {
    expect(esEnlaceUbicacion('  https://maps.app.goo.gl/abc123  ')).toBe(true);
  });

  it('una dirección normal no es un enlace', () => {
    expect(esEnlaceUbicacion('Av. Reforma 100, Col. Centro')).toBe(false);
  });

  it('un texto vacío no es un enlace', () => {
    expect(esEnlaceUbicacion('')).toBe(false);
  });
});
