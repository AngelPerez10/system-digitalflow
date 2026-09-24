import { filtrarManuales, imagenProducto, parseProductoManual, precioMxnConIva } from '../productosCatalogoApi';

describe('precios de catálogo (espejo de la web)', () => {
  it('usa precio_mxn si viene; si no, USD especial × tipo de cambio × IVA', () => {
    expect(precioMxnConIva({ precio_mxn: '1500.5' }, 20)).toBe(1500.5);
    expect(precioMxnConIva({ precios: { precio_especial: '10', precio_lista: '12' } }, 20)).toBe(232);
    expect(precioMxnConIva({ precios: { precio_lista: '12' } }, 20)).toBe(278.4);
    expect(precioMxnConIva({ precios: { precio_lista: '12' } }, null)).toBe(12);
    expect(precioMxnConIva({}, 20)).toBe(0);
  });
});

describe('catálogo manual', () => {
  const raw = { id: 5, producto: 'NVR 8 canales', marca: 'Hik', modelo: 'X1', caracteristicas: '4K', precio: '2999', stock: 2 };

  it('arma id manual:<id> y la descripción como la web', () => {
    const p = parseProductoManual(raw);
    expect(p).toMatchObject({ productoExternoId: 'manual:5', titulo: 'NVR 8 canales', precio: 2999, descripcion: 'Hik · X1\n\n4K' });
    expect(parseProductoManual({ ...raw, activo: false })).toBeNull();
  });

  it('filtra por nombre, marca o modelo', () => {
    const p = parseProductoManual(raw);
    expect(filtrarManuales(p ? [p] : [], 'hik')).toHaveLength(1);
    expect(filtrarManuales(p ? [p] : [], '')).toHaveLength(0);
  });

  it('imágenes absolutas por fuente', () => {
    expect(imagenProducto('/a.jpg', 'syscom')).toBe('https://www.syscom.mx/a.jpg');
    expect(imagenProducto('b.jpg', 'tvc')).toBe('https://cdn.tvc.mx/b.jpg');
    expect(imagenProducto('https://x/c.jpg', 'manual')).toBe('https://x/c.jpg');
  });
});
