import { enlacesWhatsApp, mensajePdf, telefonoWhatsApp } from '../whatsapp';

describe('WhatsApp del PDF', () => {
  it('normaliza teléfonos mexicanos y respeta la lada', () => {
    expect(telefonoWhatsApp('(33) 1234-5678')).toBe('523312345678');
    expect(telefonoWhatsApp('+52 1 33 1234 5678')).toBe('5213312345678');
    expect(telefonoWhatsApp('123')).toBeNull();
    expect(telefonoWhatsApp(null)).toBeNull();
  });

  it('arma los enlaces con el texto codificado', () => {
    const { app, web } = enlacesWhatsApp('523312345678', 'Hola & adiós');
    expect(app).toBe('whatsapp://send?phone=523312345678&text=Hola%20%26%20adi%C3%B3s');
    expect(web).toBe('https://wa.me/523312345678?text=Hola%20%26%20adi%C3%B3s');
    expect(enlacesWhatsApp(null, 'x').web).toBe('https://wa.me/?text=x');
  });

  it('incluye el documento y el enlace en el mensaje', () => {
    const texto = mensajePdf('el reporte de servicio ODT-12', 'https://x/p');
    expect(texto).toContain('ODT-12');
    expect(texto).toContain('https://x/p');
  });
});
