import { useState, type Key, type ReactNode } from "react";
import {
  ComboBox,
  Description,
  EmptyState,
  FieldError,
  Input,
  Label,
  ListBox,
} from "@heroui/react";
import { useComboBoxScrollLock } from "@/hooks/useComboBoxScrollLock";

export type OrdenComboItem = {
  id: string;
  label: string;
  description?: string;
};

const ITEM_CLASS =
  "min-h-[44px] min-w-0 max-w-full overflow-hidden rounded-lg data-[focused=true]:bg-[#F1F5FF] data-[selected=true]:font-medium data-[selected=true]:text-[#1B5CFF] dark:data-[focused=true]:bg-white/[0.06] dark:data-[selected=true]:text-[#4B7CFF]";

const POPOVER_CLASS =
  "z-[100050] w-(--trigger-width) max-w-(--trigger-width) max-h-72 overflow-x-hidden overflow-y-auto rounded-[10px] border border-[#E7E7EA] dark:border-[#273244]";

type Props = {
  name?: string;
  inputId: string;
  label: ReactNode;
  placeholder: string;
  triggerAriaLabel: string;
  items: OrdenComboItem[];
  selectedKey: string | null;
  inputValue: string;
  onSelectionChange: (key: string | null) => void;
  onInputChange: (value: string) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  description?: string;
  emptyMessage?: string;
  loading?: boolean;
  liveRegionText?: string;
  /** `true` = no filtrar en cliente (la lista ya viene filtrada). */
  skipLocalFilter?: boolean;
};

export default function OrdenHeroComboBox({
  name,
  inputId,
  label,
  placeholder,
  triggerAriaLabel,
  items,
  selectedKey,
  inputValue,
  onSelectionChange,
  onInputChange,
  isDisabled = false,
  isRequired = false,
  isInvalid = false,
  errorMessage,
  description,
  emptyMessage = "No hay resultados para mostrar.",
  loading = false,
  liveRegionText,
  skipLocalFilter = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  useComboBoxScrollLock(menuOpen);

  return (
    <>
      <ComboBox
        fullWidth
        allowsEmptyCollection
        menuTrigger="focus"
        validationBehavior="aria"
        name={name}
        isRequired={isRequired}
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        selectedKey={selectedKey}
        items={items}
        inputValue={inputValue}
        onInputChange={onInputChange}
        onOpenChange={setMenuOpen}
        onSelectionChange={(key: Key | null) => {
          onSelectionChange(key == null ? null : String(key));
        }}
        defaultFilter={skipLocalFilter ? () => true : undefined}
        className="w-full"
      >
        <Label className="text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">{label}</Label>
        <ComboBox.InputGroup className="w-full">
          <Input
            id={inputId}
            autoComplete="off"
            aria-busy={loading || undefined}
            placeholder={loading ? "Buscando…" : placeholder}
            className="min-h-[44px] rounded-[10px] text-[15px] tracking-[-0.1px]"
          />
          <ComboBox.Trigger aria-label={triggerAriaLabel} />
        </ComboBox.InputGroup>
        <ComboBox.Popover placement="bottom start" className={POPOVER_CLASS}>
          <ListBox
            renderEmptyState={() => (
              <EmptyState className="px-3 py-2.5 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8]">
                {loading ? "Buscando…" : emptyMessage}
              </EmptyState>
            )}
          >
            {(item: OrdenComboItem) => (
              <ListBox.Item id={item.id} textValue={`${item.label} ${item.description ?? ""}`} className={ITEM_CLASS}>
                <span className="flex min-w-0 flex-col text-left">
                  <span className="truncate">{item.label}</span>
                  {item.description ? (
                    <span className="truncate text-xs font-normal text-[#6E6E77] dark:text-[#8EA0B8]">
                      {item.description}
                    </span>
                  ) : null}
                </span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </ComboBox.Popover>
        {errorMessage ? (
          <FieldError className="text-sm text-[#c64545]">{errorMessage}</FieldError>
        ) : description ? (
          <Description className="text-sm text-[#6E6E77] dark:text-[#8EA0B8]">{description}</Description>
        ) : null}
      </ComboBox>
      {liveRegionText ? (
        <p className="sr-only" aria-live="polite">
          {liveRegionText}
        </p>
      ) : null}
    </>
  );
}
