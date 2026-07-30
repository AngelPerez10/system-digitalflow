### Task 1: Move-only a carpetas + imports verdes

**Files:**
- Move: todos los del file map (excepto Create)
- Modify: todos los imports relativos dentro de Proyectos + 2 callers externos
- Test: `tsc` + vitest de tests movidos

**Interfaces:**
- Consumes: estructura plana actual
- Produces: mismos exports en nuevas rutas; `ProyectosPage` en la misma ruta pÃºblica

- [ ] **Step 1: Crear carpetas**

Desde repo root (PowerShell):

```powershell
cd frontend/src/pages/Operacion/Proyectos
New-Item -ItemType Directory -Force -Path list, form/fields, form/cotizaciones, form/tabs, instalaciones, shared | Out-Null
```

- [ ] **Step 2: Mover archivos con `git mv`**

```powershell
git mv ProyectosMobileList.tsx list/
git mv ProyectosPageStats.tsx list/
git mv ProyectoFormModal.tsx form/
git mv ProyectoFormSection.tsx form/
git mv ProyectoEquiposSection.tsx form/fields/
git mv ProyectoEvidenciasField.tsx form/fields/
git mv ProyectoNotaDiaFotosField.tsx form/fields/
git mv ProyectoProductoThumb.tsx form/fields/
git mv ProyectoSyscomModeloPicker.tsx form/fields/
git mv proyectoCotizacionSearch.ts form/cotizaciones/
git mv proyectoCotizacionMappers.ts form/cotizaciones/
git mv proyectoCotizacionMappers.test.ts form/cotizaciones/
git mv InstalacionForm.tsx instalaciones/
git mv ProyectoFormInstalacionesPanel.tsx instalaciones/
git mv proyectoInstalacionApi.ts instalaciones/
git mv proyectoInstalacionTypes.ts instalaciones/
git mv proyectoTypes.ts shared/
git mv proyectoApi.ts shared/
git mv proyectoFormUtils.ts shared/
git mv proyectoFormUtils.fechas.test.ts shared/
git mv proyectoCloseValidation.ts shared/
git mv proyectoCloseValidation.test.ts shared/
git mv proyectoPageStyles.ts shared/
git mv proyectoImageApi.ts shared/
git mv proyectoProductoImage.ts shared/
```

- [ ] **Step 3: Actualizar imports internos**

Regla de paths relativos tras el move:

| Archivo | Antes (ejemplo) | DespuÃ©s |
|---------|-----------------|---------|
| `ProyectosPage.tsx` | `./proyectoApi` | `./shared/proyectoApi` |
| `ProyectosPage.tsx` | `./ProyectoFormModal` | `./form/ProyectoFormModal` |
| `ProyectosPage.tsx` | `./ProyectosMobileList` | `./list/ProyectosMobileList` |
| `ProyectosPage.tsx` | `./proyectoInstalacionApi` | `./instalaciones/proyectoInstalacionApi` (temporal; Task 2 â†’ barrel) |
| `form/ProyectoFormModal.tsx` | `./proyectoTypes` | `../shared/proyectoTypes` |
| `form/ProyectoFormModal.tsx` | `./ProyectoEquiposSection` | `./fields/ProyectoEquiposSection` |
| `form/ProyectoFormModal.tsx` | `../OrdenesTrabajo/...` | `../../OrdenesTrabajo/...` (subiÃ³ un nivel) |
| `list/*` | `./proyectoFormUtils` | `../shared/proyectoFormUtils` |
| `instalaciones/ProyectoFormInstalacionesPanel.tsx` | `./ProyectoFormSection` | **NO** â€” el panel hoy importa `ProyectoFormSection` de form. Sustituir: o (A) pasar `section` wrapper como children desde el modal, o (B) duplicar el wrapper mÃ­nimo de secciÃ³n **dentro** de instalaciones, o (C) mover el eyebrow/title al panel sin `ProyectoFormSection`. **Elegir C:** el panel ya tiene tÃ­tulo; dejar de importar `ProyectoFormSection` y usar markup local equivalente (mismas clases via copy de props visuales del panel actual) **sin** importar `form/`. Revisar: hoy el panel SÃ importa `ProyectoFormSection` â€” al mover, romper esa dependencia: inline el `ProyectoFormSection` usage abriendo el archivo y reemplazando el import por markup que use solo `proyectoEmptyPanelClass`â€¦ pero `proyectoEmptyPanelClass` estÃ¡ en `shared/proyectoPageStyles` y **instalaciones no puede importar shared**. |

**ResoluciÃ³n de estilos en `instalaciones/` (importante):**

Hoy el panel importa:
- `../OrdenesTrabajo/ordenTrabajoStyles` (permitido)
- `./proyectoPageStyles` (`proyectoEmptyPanelClass`) â†’ **prohibido tras regla shared**

En este task:
1. Copiar las constantes CSS string que `instalaciones/*` necesite a `instalaciones/instalacionStyles.ts` (solo las usadas: p.ej. `proyectoEmptyPanelClass` y las que use el panel).
2. Actualizar imports del panel a `./instalacionStyles`.
3. Dejar `shared/proyectoPageStyles.ts` intacto para form/list.

Para `ProyectoFormSection`: el panel lo usa. **Extraer no:** inline un wrapper local en el panel:

```tsx
// dentro de ProyectoFormInstalacionesPanel â€” reemplazar <ProyectoFormSection ...>
<section aria-labelledby={titleId} className="space-y-3">
  {/* mismo header visual que daba ProyectoFormSection: eyebrow, title, hint, icon */}
  {children}
</section>
```

Copiar el JSX de header desde `ProyectoFormSection` **solo lo necesario** para no cambiar UX (mismo `titleId`, mismos textos). No importar `form/ProyectoFormSection`.

- [ ] **Step 4: Actualizar callers externos**

`OrdenAdminCotizacionesField.tsx`:

```ts
import { searchProyectoCotizaciones } from "@/pages/Operacion/Proyectos/form/cotizaciones/proyectoCotizacionSearch";
import { displayCotizacionFolio } from "@/pages/Operacion/Proyectos/shared/proyectoFormUtils";
import {
  // mismas named exports que antes
} from "@/pages/Operacion/Proyectos/shared/proyectoPageStyles";
import type { CotizacionOrigen, CotizacionResumen } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";
```

`OrdenesPage.tsx`:

```ts
import type { CotizacionResumen } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";
```

- [ ] **Step 5: Ajustar imports relativos a `ordenTrabajoStyles` / `OrdenTrabajoModals` desde `form/`**

Desde `form/ProyectoFormModal.tsx` la ruta a Ordenes sube un nivel mÃ¡s:

```ts
import { ... } from "../../OrdenesTrabajo/OrdenTrabajoModals";
import { ... } from "../../OrdenesTrabajo/ordenTrabajoStyles";
```

Desde `instalaciones/ProyectoFormInstalacionesPanel.tsx`:

```ts
import { ... } from "../../OrdenesTrabajo/ordenTrabajoStyles";
```

- [ ] **Step 6: Verificar**

```powershell
cd frontend
pnpm exec tsc -b --noEmit
pnpm exec vitest run src/pages/Operacion/Proyectos/shared/proyectoFormUtils.fechas.test.ts src/pages/Operacion/Proyectos/shared/proyectoCloseValidation.test.ts src/pages/Operacion/Proyectos/form/cotizaciones/proyectoCotizacionMappers.test.ts
```

Expected: `tsc` exit 0; vitest all pass.

- [ ] **Step 7: Commit (solo si el usuario lo pide)**

```bash
git add frontend/src/pages/Operacion/Proyectos frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenAdminCotizacionesField.tsx frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenesPage.tsx
git commit -m "$(cat <<'EOF'
refactor(proyectos): reorganize feature into list/form/shared/instalaciones folders

EOF
)"
```

---

