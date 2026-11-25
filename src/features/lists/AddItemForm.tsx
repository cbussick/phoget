import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { householdKey } from "../../shared/api/queryKeys";
import { itemInputSchema } from "../../../shared/contracts";
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
}: {
  listId: string;
  color: string;
  onAnnounce: (message: string) => void;
}) {
  const notify = useSnackbar();
  const input = useRef<HTMLInputElement>(null);
  const restoreInputFocus = useRef(false);
  const client = useQueryClient();
  const suggestionKey = [...householdKey, "suggestions", listId];
  const suggestions = useQuery({
    queryKey: suggestionKey,
    queryFn: ({ signal }) => listApi.suggestions(listId, signal),
    retry: false,
  });
  const remove = useAction(async (name: string) => {
    await listApi.removeSuggestion(listId, name);
    await client.cancelQueries({ queryKey: suggestionKey });
    client.setQueryData<Array<string>>(suggestionKey, (names) =>
      names?.filter((option) => option !== name),
    );
    onAnnounce("Vorschlag entfernt: " + name);
  });
  useErrorSnackbar(remove.error);
  const add = useAction(async (name: string) => {
    const result = await listApi.addItem(listId, { name });
    if (result.outcome === "duplicate") {
      notify("Dieser Eintrag steht bereits auf der Liste.", "info");
    } else if (result.outcome === "created") {
      onAnnounce(name + " zur Liste hinzugefügt");
    }
  });
  const {
    form,
    busy: formBusy,
    error,
    submit,
  } = useValidatedForm(
    { name: "" },
    itemInputSchema.pick({ name: true }),
    async ({ name }, { reset }) => {
      await add.mutateAsync(name);
      reset();
      if (restoreInputFocus.current) {
        requestAnimationFrame(() => {
          // Do not steal focus if the user moved elsewhere while saving.
          if (
            document.activeElement === document.body ||
            document.activeElement === input.current
          ) {
            input.current?.focus();
          }
        });
      }
    },
  );
  useErrorSnackbar(error ?? add.error);
  const busy = formBusy || add.isPending;
  return (
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
            name={field.name}
            value={field.state.value}
            onValueChange={field.handleChange}
            onBlur={field.handleBlur}
            error={fieldError(field)}
            options={suggestions.data ?? []}
            onlyWhileTyping
            onRemove={(name) => {
              if (!remove.isPending) {
                remove.mutate(name);
              }
            }}
            label="Eintrag hinzufügen"
            hideLabel
            required
            inputRef={input}
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
  );
}
