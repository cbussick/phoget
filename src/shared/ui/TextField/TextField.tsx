import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, Ref } from "react";
import { FieldLayout, type FieldPresentation } from "../FieldLayout/FieldLayout";
import "./TextField.css";

export type TextFieldProps = FieldPresentation & {
  endAdornment?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
} & (
    | ({ multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
    | ({ multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>)
  );

export function TextField({
  label,
  hint,
  error,
  endAdornment,
  inputRef,
  ...props
}: TextFieldProps) {
  return (
    <FieldLayout
      label={label}
      hint={hint}
      error={error}
      id={props.id}
      aria-describedby={props["aria-describedby"]}
      aria-invalid={props["aria-invalid"]}
    >
      {(attributes) => {
        let control;
        if (props.multiline) {
          const { multiline: _, ...inputProps } = props;
          control = <textarea rows={3} {...inputProps} {...attributes} />;
        } else {
          const { multiline: _, ...inputProps } = props;
          control = <input ref={inputRef} type="text" {...inputProps} {...attributes} />;
        }

        return (
          <div className="field-control text-field-control">
            {control}
            {endAdornment}
          </div>
        );
      }}
    </FieldLayout>
  );
}
