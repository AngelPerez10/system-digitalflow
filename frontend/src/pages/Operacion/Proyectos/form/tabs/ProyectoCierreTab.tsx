import { Camera, PenLine } from "lucide-react";
import SignaturePad from "@/components/ui/signature/SignaturePad";
import { pickTecnicoSignatureDisplayUrl } from "@/pages/Operacion/shared/tecnicoSignatureDisplay";
import { SectionCard } from "../../shared/ProyectoUi";
import { ProyectoEvidenciasField, PROYECTO_MAX_FOTOS } from "../fields/ProyectoEvidenciasField";
import type { ProyectoFormApi } from "../useProyectoFormState";

type Props = { form: ProyectoFormApi };

export function ProyectoCierreTab({ form }: Props) {
  const {
    evidenciasUrls,
    setEvidenciasUrls,
    firmaClienteUrl,
    setFirmaClienteUrl,
    firmaTecnicoUrl,
    tecnicoSignatureUrl,
    tecnicosAsignados,
  } = form;

  const responsable = tecnicosAsignados.find((t) => t.responsable) || tecnicosAsignados[0] || null;
  const responsableNombre = responsable?.nombre?.trim() || "";
  const responsableId = responsable?.id != null ? Number(responsable.id) : null;

  return (
    <>
      <SectionCard
        id="proyecto-sec-evidencia"
        index={0}
        title="Evidencia fotográfica"
        icon={<Camera />}
        hint="Fotos del trabajo terminado. Sube pocas a la vez si la red es lenta."
        actions={
          <span
            key={evidenciasUrls.length}
            className="cot-flash inline-flex h-6 items-center rounded-full bg-[#F4F4F5] px-2.5 text-[12px] font-semibold tabular-nums text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]"
          >
            {evidenciasUrls.length}/{PROYECTO_MAX_FOTOS}
          </span>
        }
      >
        <ProyectoEvidenciasField urls={evidenciasUrls} onChange={setEvidenciasUrls} />
      </SectionCard>

      <SectionCard
        id="proyecto-sec-firmas"
        index={1}
        title="Firmas"
        icon={<PenLine />}
        hint="La del técnico se toma de su perfil (responsable). El cliente firma aquí en pantalla."
      >
        <div className="grid grid-cols-1 gap-4 touch-none md:grid-cols-2">
          <SignaturePad
            label={responsableNombre ? `Técnico responsable · ${responsableNombre}` : "Técnico responsable"}
            value={pickTecnicoSignatureDisplayUrl({
              tecnicoAsignadoId: responsableId,
              fetchedProfileUrl: tecnicoSignatureUrl,
              storedOrdenUrl: firmaTecnicoUrl,
            })}
            disabled
            onChange={() => {
              /* Solo lectura: se carga del perfil del técnico responsable */
            }}
            width={400}
            height={220}
          />
          <SignaturePad label="Cliente" value={firmaClienteUrl} onChange={setFirmaClienteUrl} width={400} height={220} />
        </div>
      </SectionCard>
    </>
  );
}
