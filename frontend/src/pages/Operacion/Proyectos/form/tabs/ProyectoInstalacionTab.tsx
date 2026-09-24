import { ProyectoFormInstalacionesPanel } from "../../instalaciones";
import type { ProyectoFormApi } from "../useProyectoFormState";

type Props = { form: ProyectoFormApi; proyectoId: number | null };

export function ProyectoInstalacionTab({ form, proyectoId }: Props) {
  return (
    <ProyectoFormInstalacionesPanel
      proyectoId={proyectoId}
      active
      draft={form.instalacionDraft}
      onDraftChange={form.setInstalacionDraft}
    />
  );
}
