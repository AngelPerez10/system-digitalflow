import { nombreCarpeta } from '../guardarPdf';

describe('nombreCarpeta', () => {
  it('traduce la carpeta de descargas y respeta otras', () => {
    expect(nombreCarpeta('content://com.android.externalstorage.documents/tree/primary%3ADownload')).toBe('Descargas');
    expect(nombreCarpeta('content://com.android.externalstorage.documents/tree/primary%3AReportes')).toBe('Reportes');
  });
});
