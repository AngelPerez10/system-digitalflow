import { AvatarStack } from "../../Proyectos/shared/ProyectoUi";
import { splitTecnicos } from "../reporteTecnicos";

type Props = {
  /** Texto guardado en el reporte («Ana Pérez, Luis Gómez»). */
  value: string;
  /** Foto de perfil por nombre en minúsculas. */
  avatars: Map<string, { id: number; url: string }>;
  max?: number;
};

/** Técnicos del reporte: avatares superpuestos con foto (como el equipo en Proyectos) y nombre. */
export function ReporteTecnicosStack({ value, avatars, max = 3 }: Props) {
  const nombres = splitTecnicos(value);
  if (nombres.length === 0) return <span className="text-[13px] text-[#A1A1AA] dark:text-[#64748B]">Sin técnico</span>;
  const people = nombres.map((n, i) => {
    const a = avatars.get(n.toLowerCase());
    return { id: a?.id ?? -(i + 1), nombre: n, avatar_url: a?.url };
  });
  return (
    <div className="flex min-w-0 items-center gap-2">
      <AvatarStack people={people} max={max} />
      <span className="min-w-0 truncate text-[13px] text-[#3F3F46] dark:text-[#D6DEEA]" title={nombres.join(", ")}>
        {nombres[0]}
        {nombres.length > 1 ? <span className="text-[#71717A] dark:text-[#8EA0B8]"> +{nombres.length - 1}</span> : null}
      </span>
    </div>
  );
}
