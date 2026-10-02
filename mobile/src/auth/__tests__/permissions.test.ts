import type { SessionUser } from '@/types/api';
import { canCreateModule, canDeleteModule, canEditModule, canViewModule, isReportesOwnOnly } from '../permissions';

const usuario = (admin: boolean): SessionUser =>
  ({
    id: 1,
    username: 'u',
    email: null,
    first_name: '',
    last_name: '',
    is_staff: admin,
    is_superuser: false,
    avatar_url: null,
  }) as SessionUser;

describe('permisos de reportes de mantenimiento', () => {
  const tecnico = usuario(false);
  const admin = usuario(true);

  it('el técnico solo ve lo que su rol declara', () => {
    const permisos = { reportes_mantenimiento: { view: true, create: true, edit: false, delete: false } };
    expect(canViewModule(permisos, tecnico, 'reportes_mantenimiento')).toBe(true);
    expect(canCreateModule(permisos, tecnico, 'reportes_mantenimiento')).toBe(true);
    expect(canEditModule(permisos, tecnico, 'reportes_mantenimiento')).toBe(false);
    expect(canDeleteModule(permisos, tecnico, 'reportes_mantenimiento')).toBe(false);
    expect(canViewModule({}, tecnico, 'reportes_mantenimiento')).toBe(false);
  });

  it('«solo mis reportes» por defecto para quien no es admin, como el backend', () => {
    expect(isReportesOwnOnly({}, tecnico)).toBe(true);
    expect(isReportesOwnOnly({}, admin)).toBe(false);
    expect(isReportesOwnOnly({ reportes_mantenimiento: { own_only: false } }, tecnico)).toBe(false);
    expect(isReportesOwnOnly({ reportes_mantenimiento: { own_only: true } }, admin)).toBe(true);
  });
});
