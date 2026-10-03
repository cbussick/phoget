import { useEffect, useRef } from "react";
import { itemInputSchema } from "../../../shared/contracts";
import type { useSuggestions } from "./Suggestions";
import { useValidatedForm, fieldError } from "../../shared/forms/useValidatedForm";
import { Button } from "../../shared/ui/Button/Button";
import { Icon } from "../../shared/ui/Icon/Icon";
import { ComboBox } from "../../shared/ui/ComboBox/ComboBox";
import { useSnackbar } from "../../shared/ui/Snackbar/Snackbar";
import { useErrorSnackbar } from "../../shared/ui/Snackbar/useErrorSnackbar";
import { listApi } from "./listApi";
import { useAction } from "../../shared/api/useAction";

export function AddItemForm({
  listId,
  color,
  onAnnounce,
  suggestionState,
}: {
  listId: string;
  color: string;
  onAnnounce: (message: string) => void;
  suggestionState: ReturnType<typeof useSuggestions>;
}) {
  const notify = useSnackbar();
  const input = useRef<HTMLInputElement>(null);
  const restoreInputFocus = useRef(false);
  const focusAfterForget = useRef(false);
  const { history, names, forget } = suggestionState;
  useEffect(() => {
    if (!suggestionState.busy && focusAfterForget.current) {
      focusAfterForget.current = false;
      if (document.activeElement === document.body) input.current?.focus();
    }
  }, [suggestionState.busy]);
  const add = useAction(async (name: string) => {
    const result = await listApi.addItem(listId, { name });
    if (result.outcome === "duplicate") {
      notify("Dieser Eintrag steht bereits auf der Liste.", "info");
    } else if (result.outcome === "created") {
      onAnnounce(name + " zur Liste hinzugefügt");
    }
  });
  const eligibleNames = new Set(names.map((name) => name.toLowerCase()));
  const suggestions = (history.data?.oftenBought ?? []).filter((item) =>
    eligibleNames.has(item.name.toLowerCase()),
  );
  const {
    form,
    busy: formBusy,
    error,
    submit,
  } = useValidatedForm({ name: "" }, itemInputSchema.pick({ name: true }), async ({ name }) => {
    await add.mutateAsync(name);
    form.reset();
    if (restoreInputFocus.current) {
      requestAnimationFrame(() => {
        // Do not steal focus if the user moved elsewhere while saving.
        if (document.activeElement === document.body || document.activeElement === input.current) {
          input.current?.focus();
        }
      });
    }
  });
  useErrorSnackbar(error ?? add.error);
  const busy = formBusy || add.isPending || suggestionState.busy;
  return (
    <>
      <form
        noValidate
        className="add-item-form"
        onKeyDownCapture={(event) => {
          restoreInputFocus.current = event.target === input.current && event.key === "Enter";
        }}
        onPointerDownCapture={() => {
          restoreInputFocus.current = false;
        }}
        onSubmit={(event) => {
          if (busy) {
            event.preventDefault();
            return;
          }
          submit(event);
        }}
      >
        <form.Field name="name">
          {(field) => (
            <ComboBox
              label="Eintrag hinzufügen"
              required
              name={field.name}
              inputRef={input}
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              error={fieldError(field)}
              options={names}
              onRemove={(name) => {
                focusAfterForget.current = true;
                forget(name);
              }}
              disabled={busy}
              placeholder="Eintrag hinzufügen…"
            />
          )}
        </form.Field>
        <Button
          size="add"
          type="submit"
          accentColor={color}
          loading={busy}
          loadingLabel="Wird hinzugefügt…"
        >
          <Icon name="plus" />
          Hinzufügen
        </Button>
      </form>
      {history.isError ? (
        <p className="field-hint">
          Vorschläge sind nicht verfügbar. Du kannst trotzdem einen neuen Eintrag hinzufügen.
        </p>
      ) : null}
      {suggestions.length ? (
        <div className="quick-add" role="group" aria-label="Vorschläge zum schnellen Hinzufügen">
          <span>Häufig gekauft</span>
          {suggestions.map(({ name }) => (
            <Button
              variant="secondary"
              size="compact"
              key={name}
              disabled={busy}
              onClick={() => {
                if (busy) return;
                add.mutate(name);
              }}
            >
              + {name}
            </Button>
          ))}
        </div>
      ) : null}
    </>
  );
}
