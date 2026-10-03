import type { Ref, FocusEventHandler, KeyboardEventHandler } from "react";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import "./OptionList.css";
export type ListOption = { value: string; label: string; disabled?: boolean };
export function OptionList({
  ref,
  id,
  labelledBy,
  options,
  selected,
  active,
  onActive,
  onChoose,
  onRemove,
  onBlur,
  onKeyDown,
}: {
  ref: Ref<HTMLDivElement>;
  id: string;
  labelledBy: string;
  options: readonly ListOption[];
  selected?: string;
  active?: string;
  onActive: (value: string) => void;
  onChoose: (value: string) => void;
  onRemove?: (value: string) => void;
  onBlur?: FocusEventHandler<HTMLDivElement>;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      id={id}
      role={onRemove ? "grid" : "listbox"}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      aria-labelledby={labelledBy}
      popover="manual"
      className="option-popup"
      onMouseDown={(event) => event.preventDefault()}
    >
      {onRemove
        ? options.map((option) => (
            <div
              key={option.value}
              role="row"
              className="suggestion-option-row"
              data-highlighted={option.value === active}
            >
              <div
                role="gridcell"
                id={id + "-" + encodeURIComponent(option.value)}
                aria-selected={option.value === selected}
              >
                <Button
                  variant="ghost"
                  tabIndex={-1}
                  className="listbox-option"
                  disabled={option.disabled}
                  onPointerMove={() => {
                    if (!option.disabled) onActive(option.value);
                  }}
                  onClick={() => onChoose(option.value)}
                >
                  <span>{option.label}</span>
                </Button>
              </div>
              <div role="gridcell">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={option.disabled}
                  aria-label={`Vorschlag vergessen: ${option.label}`}
                  title="Eintrag vergessen"
                  onClick={() => onRemove(option.value)}
                >
                  ×
                </Button>
              </div>
            </div>
          ))
        : options.map((option) => (
            <Button
              key={option.value}
              id={id + "-" + encodeURIComponent(option.value)}
              variant="ghost"
              role="option"
              tabIndex={-1}
              className="listbox-option"
              aria-selected={option.value === selected}
              disabled={option.disabled}
              data-highlighted={option.value === active}
              onPointerMove={() => {
                if (!option.disabled) onActive(option.value);
              }}
              onClick={() => onChoose(option.value)}
            >
              <span>{option.label}</span>
              {option.value === selected ? <Icon name="check" /> : null}
            </Button>
          ))}
    </div>
  );
}
