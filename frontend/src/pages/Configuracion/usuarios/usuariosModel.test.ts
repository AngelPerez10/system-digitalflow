import { describe, expect, it } from 'vitest';
import { applyPermChange, lockedForTecnico, normalizePerms, validateUserForm, emptyUserForm } from './usuariosModel';

const none = { view: false, create: false, edit: false, delete: false };

describe('applyPermChange', () => {
  it('marcar una acción activa «Ver»', () => {
    expect(applyPermChange(none, 'edit', true)).toMatchObject({ view: true, edit: true });
  });

  it('quitar «Ver» quita todas las acciones y conserva el alcance', () => {
    const cur = { view: true, create: true, edit: true, delete: true, own_only: true };
    expect(applyPermChange(cur, 'view', false)).toEqual({ ...none, own_only: true });
  });

  it('quitar una acción no toca «Ver»', () => {
    const cur = { view: true, create: true, edit: false, delete: false };
    expect(applyPermChange(cur, 'create', false)).toEqual({ ...cur, create: false });
  });
});

describe('lockedForTecnico', () => {
  it('solo bloquea eliminar reportes semanales', () => {
    expect(lockedForTecnico('reportes', 'delete')).toBe(true);
    expect(lockedForTecnico('reportes', 'edit')).toBe(false);
    expect(lockedForTecnico('ordenes', 'delete')).toBe(false);
  });
});

describe('normalizePerms', () => {
  it('técnicos ven solo lo suyo en órdenes por defecto; admins, todo el equipo', () => {
    expect(normalizePerms({}, { isAdmin: false }).ordenes.own_only).toBe(true);
    expect(normalizePerms({}, { isAdmin: true }).ordenes.own_only).toBe(false);
  });

  it('respeta valores guardados e ignora los no booleanos', () => {
    const n = normalizePerms({ inventario: { view: true, create: 'x' as unknown as boolean } });
    expect(n.inventario).toMatchObject({ view: true, create: false });
  });
});

describe('validateUserForm', () => {
  it('en alta exige contraseña y la manda a la pestaña de cuenta', () => {
    expect(validateUserForm({ ...emptyUserForm, username: 'ana' }, 'create')).toEqual({
      message: 'Contraseña es requerida',
      tab: 'cuenta',
    });
  });

  it('en edición la contraseña es opcional', () => {
    expect(validateUserForm({ ...emptyUserForm, username: 'ana' }, 'edit')).toBeNull();
  });

  it('en edición, confirmación distinta apunta a Seguridad', () => {
    const f = { ...emptyUserForm, username: 'ana', password: 'Segura123!', password2: 'otra' };
    expect(validateUserForm(f, 'edit')?.tab).toBe('seguridad');
  });
});
