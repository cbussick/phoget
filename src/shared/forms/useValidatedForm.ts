import { useState } from "react";
import type { FormEvent } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import type { DeepKeys } from "@tanstack/react-form";
import { ApiError } from "../api/request";
import type { z } from "zod";

type FieldErrors<T> = Partial<Record<DeepKeys<T>, string>>;
function isFieldKey<T extends Record<string, string>>(values: T, key: string): key is DeepKeys<T> & string {
  return Object.hasOwn(values, key);
}

export function useValidatedForm<T extends Record<string, string>>(
  defaultValues: T,
  schema: z.ZodType<unknown, T>,
  save: (value: T) => Promise<void>,
) {
  const [error, setError] = useState<Error | null>(null);
  const form = useForm({
    defaultValues,
    validators: { onSubmit: schema },
    onSubmit: async ({ value, formApi }) => {
      setError(null);
      try {
        await save(value);
      } catch (error_) {
        if (
          error_ instanceof ApiError &&
          error_.field &&
          isFieldKey(defaultValues, error_.field)
        ) {
          const fields: FieldErrors<T> = {};
          fields[error_.field] = error_.message;
          formApi.setErrorMap({ onSubmit: { fields } });
        } else {
          setError(error_ instanceof Error ? error_ : new Error("Bitte versuche es erneut."));
        }
      }
    },
  });
  const busy = useStore(form.store, (state) => state.isSubmitting);
  // An unchanged invalid field must redraw when submit makes its error visible.
  useStore(form.store, (state) => state.submissionAttempts);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    if (form.state.isSubmitting) {
      return;
    }
    void form.handleSubmit().then(() => {
      if (!form.state.isValid) {
        element.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }
    });
  }
  return { form, busy, error, submit };
}

type Field = {
  name: string;
  state: { value: string; meta: { errors: Array<unknown> } };
  form: { state: { submissionAttempts: number } };
  handleChange: (value: string) => void;
  handleBlur: () => void;
};
export function fieldError(field: Pick<Field, "state" | "form">) {
  if (!field.form.state.submissionAttempts) {
    return undefined;
  }
  const error = field.state.meta.errors[0];
  return typeof error === "string"
    ? error
    : error && typeof error === "object" && "message" in error
      ? String(error.message)
      : undefined;
}
export function textFieldProps(field: Field) {
  return {
    name: field.name,
    value: field.state.value,
    onBlur: field.handleBlur,
    onChange: (event: { target: { value: string } }) => field.handleChange(event.target.value),
    error: fieldError(field),
  };
}
