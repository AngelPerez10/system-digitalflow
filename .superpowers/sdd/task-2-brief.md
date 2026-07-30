### Task 2: Barrel `instalaciones/index.ts` + consumidores

**Files:**
- Create: `frontend/src/pages/Operacion/Proyectos/instalaciones/index.ts`
- Modify: `ProyectosPage.tsx`, `form/ProyectoFormModal.tsx`
- Test: `tsc`

**Interfaces:**
- Consumes: exports existentes en `proyectoInstalacionTypes` / `proyectoInstalacionApi` / panel
- Produces: API pÃºblica del barrel:

```ts
// instalaciones/index.ts
export { ProyectoFormInstalacionesPanel } from "./ProyectoFormInstalacionesPanel";
export {
  type ProyectoInstalacionDraft,
  emptyInstalacionDraft,
  buildInstalacionPayload,
} from "./proyectoInstalacionTypes";
export {
  createProyectoInstalacion,
  isProyectoInstalacionApiError,
} from "./proyectoInstalacionApi";
```

- [ ] **Step 1: Crear el barrel** con exactamente los exports de arriba.

- [ ] **Step 2: Apuntar `ProyectosPage` al barrel**

```ts
import {
  createProyectoInstalacion,
  isProyectoInstalacionApiError,
  buildInstalacionPayload,
  type ProyectoInstalacionDraft,
} from "./instalaciones";
```

Eliminar imports directos a `proyectoInstalacionApi` / `proyectoInstalacionTypes`.

- [ ] **Step 3: Apuntar `ProyectoFormModal` al barrel**

```ts
import {
  ProyectoFormInstalacionesPanel,
  emptyInstalacionDraft,
  type ProyectoInstalacionDraft,
} from "../instalaciones";
```

- [ ] **Step 4: Verificar que no queden imports profundos a instalaciones desde fuera**

```powershell
cd frontend
rg "Proyectos/instalaciones/" src --glob "*.{ts,tsx}"
```

Expected: solo paths `â€¦/instalaciones` o `â€¦/instalaciones/index` (o relativos `./instalaciones` / `../instalaciones`), **sin** `instalaciones/proyectoInstalacionApi` fuera de la carpeta `instalaciones/`.

- [ ] **Step 5: `tsc`**

```powershell
pnpm exec tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 6: Commit (solo si el usuario lo pide)**

```bash
git commit -m "refactor(proyectos): add instalaciones public barrel"
```

---

