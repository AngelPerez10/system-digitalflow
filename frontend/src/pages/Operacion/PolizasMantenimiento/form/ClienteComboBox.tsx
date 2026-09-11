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
import { fetchClientesCatalog } from "@/components/clientes/fetchClientesCatalog";
import { useComboBoxScrollLock } from "@/hooks/useComboBoxScrollLock";
import { clienteToSelectOption, mergeClienteOptions } from "../list/polizaClienteOptions";

type SelectOption = { value: string; label: string };

const ITEM_CLASS =
  "min-h-[44px] min-w-0 max-w-full overflow-hidden rounded-lg data-[focused=true]:bg-[#F1F5FF] data-[selected=true]:font-medium data-[selected=true]:text-[#1B5CFF] dark:data-[focused=true]:bg-white/[0.06] dark:data-[selected=true]:text-[#4B7CFF]";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 200;

type Props = {
  clienteId: string;
  extraOption?: SelectOption | null;
  error: string;
  onClienteChange: (id: string, label: string) => void;
};

export default function ClienteComboBox({
  clienteId,
  extraOption = null,
  error,
  onClienteChange,
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

  return (
    <>
      <ComboBox
        fullWidth
        allowsEmptyCollection
        menuTrigger="focus"
        isRequired
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
        }}
        defaultFilter={() => true}
        isInvalid={isInvalid}
        className="w-full"
      >
        <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
          Elegir cliente
        </Label>
        <ComboBox.InputGroup className="w-full">
          <Input
            id="poliza-elegir-cliente"
            autoComplete="off"
            aria-busy={loading}
            placeholder={loading ? "Buscando contactos…" : "Buscar empresa, persona o proveedor"}
            className="min-h-[44px] rounded-[10px] text-[15px] tracking-[-0.1px]"
          />
          <ComboBox.Trigger aria-label="Mostrar lista de clientes" />
        </ComboBox.InputGroup>
        <ComboBox.Popover
          placement="bottom start"
          className="z-[100050] w-(--trigger-width) max-w-(--trigger-width) max-h-72 overflow-x-hidden overflow-y-auto rounded-[10px] border border-[#E7E7EA] dark:border-[#273244]"
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
              <ListBox.Item id={option.value} textValue={option.label} className={ITEM_CLASS}>
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </ComboBox.Popover>
        {error ? (
          <FieldError className="text-sm text-[#c64545]">{error}</FieldError>
        ) : loadError ? (
          <FieldError className="text-sm text-[#c64545]">{loadError}</FieldError>
        ) : (
          <Description className="text-sm text-[#6E6E77] dark:text-[#8EA0B8]">
            {loading
              ? "Buscando contactos…"
              : "Incluye empresas, personas y proveedores. Escribe el nombre para buscar más allá de la primera página."}
          </Description>
        )}
      </ComboBox>
      <p className="sr-only" aria-live="polite">
        {loading ? "Buscando contactos" : searchQuery ? `${options.length} contactos encontrados` : ""}
      </p>
    </>
  );
}
