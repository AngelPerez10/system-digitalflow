import { startTransition, useEffect, useState, type Key } from "react";
import {
  ComboBox,
  Description,
  EmptyState,
  FieldError,
  Input,
  Label,
  ListBox,
} from "@heroui/react";
import { Building2, Mail, Truck, UserRound, X } from "lucide-react";
import { fetchClientesCatalog } from "@/components/clientes";
import { useComboBoxScrollLock } from "@/hooks/useComboBoxScrollLock";
import { fieldError, fieldHint, fieldLabel } from "../../../Proyectos/shared/proyectoTokens";
import {
  clienteNombreFromOptionLabel,
  clienteToSelectOption,
  mergeClienteOptions,
  type ClienteSelectOption as SelectOption,
  type ClienteTipoContacto,
} from "../list/polizaClienteOptions";

const ITEM_CLASS =
  "group/item min-h-[56px] min-w-0 max-w-full gap-3 overflow-hidden rounded-[10px] py-2 ps-2.5 pe-9 data-[focused=true]:bg-[#F4F4F5] data-[selected=true]:bg-[#EEF3FF] dark:data-[focused=true]:bg-white/[0.06] dark:data-[selected=true]:bg-[#1B2A63]/70";

/** Ícono y tono neutro por tipo de contacto (el azul se reserva para la selección). */
const TIPO_META: Record<ClienteTipoContacto, { Icon: typeof Building2; tile: string }> = {
  Empresa: {
    Icon: Building2,
    tile: "bg-[#F4F4F5] text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]",
  },
  Persona: {
    Icon: UserRound,
    tile: "bg-[#FFF8EB] text-[#8A5D0F] dark:bg-[#E6A23C]/15 dark:text-[#E6A23C]",
  },
  Proveedor: {
    Icon: Truck,
    tile: "bg-[#E9F8F0] text-[#04724D] dark:bg-[#22A06B]/15 dark:text-[#22A06B]",
  },
};

/** El catálogo a veces guarda varios correos en un campo («a@x.mx || b@x.mx»). */
function separarCorreos(raw = ""): string[] {
  return raw
    .split(/\s*(?:\|\||[|;,\s])\s*/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function ClienteOptionRow({ option }: { option: SelectOption }) {
  const nombre = option.nombre || clienteNombreFromOptionLabel(option.label) || option.label;
  const [correo, ...otrosCorreos] = separarCorreos(option.correo);
  const meta = option.tipo ? TIPO_META[option.tipo] : null;
  const Icon = meta?.Icon ?? Building2;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <span
        aria-hidden
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] ${meta?.tile ?? TIPO_META.Empresa.tile}`}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-medium tracking-[-0.1px] text-[#09090B] group-data-[selected=true]/item:text-[#1244D1] dark:text-[#F8FAFC] dark:group-data-[selected=true]/item:text-[#4B7CFF]">
          {nombre}
        </span>
        {correo ? (
          <span className="flex min-w-0 items-center gap-1 text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
            <Mail className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{correo}</span>
            {otrosCorreos.length > 0 ? (
              <span
                className="shrink-0 text-[#A1A1AA] tabular-nums dark:text-[#64748B]"
                title={otrosCorreos.join(", ")}
              >
                +{otrosCorreos.length}
              </span>
            ) : null}
          </span>
        ) : option.tipo != null ? (
          <span className="text-[12.5px] italic text-[#A1A1AA] dark:text-[#64748B]">Sin correo registrado</span>
        ) : null}
      </span>
      {option.tipo ? (
        <span className="hidden shrink-0 rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[11px] font-medium text-[#52525B] ring-1 ring-inset ring-[#E4E4E7] sm:inline-flex dark:bg-white/[0.06] dark:text-[#B7C1D1] dark:ring-[#273244]">
          {option.tipo}
        </span>
      ) : null}
    </span>
  );
}

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 200;

type Props = {
  clienteId: string;
  extraOption?: SelectOption | null;
  error: string;
  onClienteChange: (id: string, label: string) => void;
  /** Por defecto obligatorio (pólizas); en contratos solo prellena datos. */
  required?: boolean;
  label?: string;
};

export default function ClienteComboBox({
  clienteId,
  extraOption = null,
  error,
  onClienteChange,
  required = true,
  label: labelText = "Cliente",
}: Props) {
  const extraValue = extraOption?.value || "";
  const extraLabel = extraOption?.label || "";
  const [inputValue, setInputValue] = useState(extraLabel);
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState<SelectOption[]>(extraValue ? [{ value: extraValue, label: extraLabel }] : []);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError("");
      void fetchClientesCatalog(searchQuery, PAGE_SIZE)
        .then((rows) => {
          if (cancelled) return;
          const mapped = rows.filter((c) => c && c.id != null).map((c) => clienteToSelectOption(c));
          startTransition(() => {
            setOptions(
              mergeClienteOptions(mapped, extraValue ? { value: extraValue, label: extraLabel } : null)
            );
          });
        })
        .catch(() => {
          if (cancelled) return;
          setLoadError("No se pudieron cargar Empresa, Personas ni Proveedores.");
          setOptions(extraValue ? [{ value: extraValue, label: extraLabel }] : []);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, extraValue, extraLabel]);

  const isInvalid = Boolean(error) || Boolean(loadError);
  const [menuOpen, setMenuOpen] = useState(false);
  useComboBoxScrollLock(menuOpen);

  const limpiar = () => {
    setInputValue("");
    setSearchQuery("");
    onClienteChange("", "");
  };

  return (
    <>
      <ComboBox
        fullWidth
        allowsEmptyCollection
        menuTrigger="focus"
        isRequired={required}
        validationBehavior="aria"
        name="clienteId"
        selectedKey={clienteId || null}
        items={options}
        onOpenChange={setMenuOpen}
        onSelectionChange={(key: Key | null) => {
          const next = key == null ? "" : String(key);
          const label = options.find((c) => c.value === next)?.label || extraLabel;
          if (next && label) setInputValue(label);
          onClienteChange(next, label);
        }}
        inputValue={inputValue}
        onInputChange={(value) => {
          setInputValue(value);
          setSearchQuery(value);
          // Borrar el texto quita al contacto (y con él los datos que prellenó).
          if (!value.trim() && clienteId) onClienteChange("", "");
        }}
        defaultFilter={() => true}
        isInvalid={isInvalid}
        className="w-full"
      >
        <Label className={fieldLabel}>
          {labelText}
        </Label>
        <ComboBox.InputGroup className="w-full">
          <Input
            id="poliza-elegir-cliente"
            autoComplete="off"
            aria-busy={loading}
            placeholder={loading ? "Buscando contactos…" : "Buscar por nombre, correo o RFC"}
            className={`min-h-[44px] rounded-[10px] text-[15px] tracking-[-0.1px] ${clienteId ? "pe-[4.5rem]" : ""}`}
          />
          {clienteId ? (
            <button
              type="button"
              onClick={limpiar}
              aria-label="Quitar contacto seleccionado"
              title="Quitar contacto"
              className="cot-press absolute end-9 top-1/2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-[#A1A1AA] hover:bg-[#F4F4F5] hover:text-[#52525B] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:text-[#64748B] dark:hover:bg-white/[0.06] dark:hover:text-[#D6DEEA]"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
          <ComboBox.Trigger aria-label="Mostrar lista de clientes" />
        </ComboBox.InputGroup>
        <ComboBox.Popover
          placement="bottom start"
          shouldFlip={false}
          className="cot-pop z-[100050] w-(--trigger-width) max-w-(--trigger-width) max-h-80 overflow-x-hidden overflow-y-auto rounded-[14px] border border-[#E7E7EA] bg-white p-1.5 shadow-[0_6px_20px_-12px_rgba(9,9,11,0.25)] dark:border-[#273244] dark:bg-[#111827]"
        >
          <ListBox
            renderEmptyState={() => (
              <EmptyState className="px-3 py-2.5 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8]">
                {loading
                  ? "Buscando contactos…"
                  : "No hay contactos para mostrar. Revísalos en Contactos: Empresa, Personas o Proveedores."}
              </EmptyState>
            )}
          >
            {(option: SelectOption) => (
              <ListBox.Item
                id={option.value}
                textValue={option.correo ? `${option.label} ${option.correo}` : option.label}
                className={ITEM_CLASS}
              >
                <ClienteOptionRow option={option} />
                <ListBox.ItemIndicator className="text-[#1B5CFF] dark:text-[#4B7CFF]" />
              </ListBox.Item>
            )}
          </ListBox>
        </ComboBox.Popover>
        {error ? (
          <FieldError className={fieldError}>{error}</FieldError>
        ) : loadError ? (
          <FieldError className={fieldError}>{loadError}</FieldError>
        ) : (
          <Description className={fieldHint}>
            {loading
              ? "Buscando contactos…"
              : "Incluye empresas, personas y proveedores. Busca por nombre, correo o RFC para ir más allá de la primera página."}
          </Description>
        )}
      </ComboBox>
      <p className="sr-only" aria-live="polite">
        {loading ? "Buscando contactos" : searchQuery ? `${options.length} contactos encontrados` : ""}
      </p>
    </>
  );
}
