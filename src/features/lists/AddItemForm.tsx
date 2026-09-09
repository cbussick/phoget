import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { itemInputSchema, itemHistorySchema } from "../../../shared/contracts";
import { useValidatedForm, fieldError } from "../../shared/forms/useValidatedForm";
import { Button } from "../../shared/ui/Button/Button";
import { Icon } from "../../shared/ui/Icon/Icon";
import { ComboBox } from "../../shared/ui/ComboBox/ComboBox";
import { Feedback } from "../../shared/ui/Feedback/Feedback";
import { request } from "../../shared/api/request";
import { householdKey } from "../../shared/api/queryKeys";
import { listApi } from "./listApi";
import { useAction } from "../../shared/api/useAction";

export function AddItemForm({
  listId,
  color,
  onAnnounce,
}: {
  listId: string;
  color: string;
  onAnnounce: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const restoreInputFocus = useRef(false);
  const history = useQuery({
    queryKey: [...householdKey, "history", listId],
    queryFn: ({ signal }) =>
      request("/lists/" + listId + "/history", itemHistorySchema, { signal }),
    refetchInterval: 5000,
    retry: false,
  });
  const add = useAction(async (name: string) => {
    await listApi.addItem(listId, { name });
    onAnnounce(name + " zur Liste hinzugefügt");
  });
  const suggestions = history.data?.oftenBought ?? [];
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
  const busy = formBusy || add.isPending;
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
              options={history.data?.names ?? []}
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
      <Feedback error={error ?? add.error} />
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
