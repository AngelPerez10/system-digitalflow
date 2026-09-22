import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/theme/ThemeProvider';
import { font, spacing, type } from '@/theme/tokens';
import type { Proyecto } from '@/types/proyecto';

type Rol = 'responsable' | 'tecnico' | 'auxiliar';

interface Persona {
  key: string;
  nombre: string;
  avatar: string | null;
  rol: Rol;
}

const ROL_LABEL: Record<Rol, string> = {
  responsable: 'Responsable',
  tecnico: 'Técnico',
  auxiliar: 'Auxiliar',
};

/** Responsable primero, luego técnicos y auxiliares (misma regla que la tarjeta del listado). */
export function personasDelEquipo(proyecto: Pick<Proyecto, 'tecnicos' | 'auxiliares'>): Persona[] {
  const tecnicos = [...proyecto.tecnicos].sort((a, b) => Number(b.responsable) - Number(a.responsable));
  return [
    ...tecnicos.map((t, i) => ({
      key: `t-${t.id ?? i}`,
      nombre: t.nombre.trim() || 'Sin nombre',
      avatar: t.avatar_url?.trim() || null,
      rol: (t.responsable ? 'responsable' : 'tecnico') as Rol,
    })),
    ...proyecto.auxiliares.map((a, i) => ({
      key: `a-${a.id ?? i}`,
      nombre: a.nombre.trim() || 'Sin nombre',
      avatar: a.avatar_url?.trim() || null,
      rol: 'auxiliar' as Rol,
    })),
  ];
}

const FOTO = 58;

/**
 * Equipo como fila deslizable de fotos de perfil (formato «historias»): foto
 * con anillo del color del rol, primer nombre y rol. El responsable va primero
 * con anillo dorado.
 */
export function EquipoTrabajo({ proyecto }: { proyecto: Pick<Proyecto, 'tecnicos' | 'auxiliares'> }) {
  const { colors } = useTheme();
  const personas = personasDelEquipo(proyecto);

  if (personas.length === 0) {
    return <Text style={[styles.vacio, { color: colors.inkSubtle }]}>Sin personas asignadas.</Text>;
  }

  const anillo: Record<Rol, string> = {
    responsable: colors.gold,
    tecnico: colors.primary,
    auxiliar: colors.statusPausadoText,
  };
  const rolColor: Record<Rol, string> = {
    responsable: colors.goldSoftText,
    tecnico: colors.primary,
    auxiliar: colors.statusPausadoText,
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
      {personas.map((p) => {
        const [primerNombre, ...resto] = p.nombre.split(/\s+/);
        return (
          <View key={p.key} style={styles.persona} accessible accessibilityLabel={`${p.nombre}, ${ROL_LABEL[p.rol]}`}>
            <View style={[styles.anillo, { borderColor: anillo[p.rol] }]}>
              <Avatar
                uri={p.avatar}
                iniciales={inicialesUsuarioDisplay(p.nombre, '?')}
                size={FOTO}
                fondo={colors.navy}
                color={colors.onNavy}
              />
            </View>
            <Text style={[styles.nombre, { color: colors.ink }]} numberOfLines={1}>
              {primerNombre}
            </Text>
            {resto.length ? (
              <Text style={[styles.apellido, { color: colors.inkMuted }]} numberOfLines={1}>
                {resto.join(' ')}
              </Text>
            ) : null}
            <Text style={[styles.rol, { color: rolColor[p.rol] }]}>{ROL_LABEL[p.rol]}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  vacio: { ...type.caption },
  fila: { gap: spacing.lg, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  persona: { width: 76, alignItems: 'center' },
  anillo: { padding: 2.5, borderWidth: 2.5, borderRadius: (FOTO + 10) / 2, marginBottom: spacing.xs },
  nombre: { ...type.label, fontFamily: font.semibold, fontSize: 13, textAlign: 'center' },
  apellido: { ...type.caption, fontSize: 11, lineHeight: 14, textAlign: 'center' },
  rol: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 3 },
});
