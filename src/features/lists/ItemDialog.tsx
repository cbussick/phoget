import { itemInputSchema, type Item } from "../../../shared/contracts";
import { useValidatedForm, textFieldProps } from "../../shared/forms/useValidatedForm";
import { Dialog } from "../../shared/ui/Dialog/Dialog";
import { TextField } from "../../shared/ui/TextField/TextField";
import { Button } from "../../shared/ui/Button/Button";
import { useErrorSnackbar } from "../../shared/ui/Snackbar/useErrorSnackbar";
import { listApi } from "./listApi";
import { useAction } from "../../shared/api/useAction";

export function ItemDialog({
  item,
  onClose,
  onAnnounce,
}: {
  item: Item;
  onClose: () => void;
  onAnnounce: (message: string) => void;
}) {
  const save = useAction((value: { name: string; note: string }) =>
    listApi.editItem(item.id, value),
  );
  const remove = useAction(() => listApi.removeItem(item.id));
  const {
    form,
    busy: saving,
    error,
    submit,
  } = useValidatedForm(
    { name: item.name, note: item.note },
    itemInputSchema.required(),
    async (value) => {
      await save.mutateAsync(value);
      onAnnounce(value.name + " aktualisiert");
      onClose();
    },
  );
  useErrorSnackbar(error ?? remove.error);
  const busy = saving || remove.isPending;
  return (
    <Dialog
      title={item.name}
      eyebrow="Eintrag bearbeiten"
      onClose={onClose}
      busy={busy}
      onSubmit={(event) => {
        if (remove.isPending) event.preventDefault();
        else submit(event);
      }}
    >
      <form.Field name="name">
        {(field) => (
          <TextField {...textFieldProps(field)} label="Eintrag" required disabled={busy} />
        )}
      </form.Field>
      <form.Field name="note">
        {(field) => (
          <TextField
            {...textFieldProps(field)}
            label="Notiz"
            multiline
            placeholder="Ein hilfreiches Detail hinzufügen…"
            disabled={busy}
          />
        )}
      </form.Field>
      <div className="dialog-actions">
        <Button
          variant="danger"
          loading={remove.isPending}
          loadingLabel="Wird entfernt…"
          disabled={busy}
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => {
                onAnnounce(item.name + " entfernt");
                onClose();
              },
            })
          }
        >
          Eintrag entfernen
        </Button>
        <Button type="submit" loading={saving} disabled={busy}>
          Änderungen speichern
        </Button>
      </div>
    </Dialog>
  );
}
