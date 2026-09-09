import type { Ref } from "react";
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
}: {
  ref: Ref<HTMLDivElement>;
  id: string;
  labelledBy: string;
  options: readonly ListOption[];
  selected?: string;
  active?: string;
  onActive: (value: string) => void;
  onChoose: (value: string) => void;
}) {
  return (
    <div
      ref={ref}
      id={id}
      role="listbox"
      aria-labelledby={labelledBy}
      popover="manual"
      className="option-popup"
      onMouseDown={(event) => event.preventDefault()}
    >
      {options.map((option) => (
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
