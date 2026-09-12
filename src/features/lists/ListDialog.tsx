import { useState } from "react";
import type { z } from "zod";
import { DEFAULT_LIST_COLOR } from "../../../shared/colors";
import { ColorPicker } from "../../shared/ui/ColorPicker/ColorPicker";
import { iconSchema, listInputSchema, type List } from "../../../shared/contracts";
import { useValidatedForm, textFieldProps, fieldError } from "../../shared/forms/useValidatedForm";
import { navigate } from "../../app/navigation";
import { Dialog } from "../../shared/ui/Dialog/Dialog";
import { TextField } from "../../shared/ui/TextField/TextField";
import { useErrorSnackbar } from "../../shared/ui/Snackbar/useErrorSnackbar";
import { Button } from "../../shared/ui/Button/Button";
import { ToggleButtonGroup } from "../../shared/ui/ToggleButtonGroup/ToggleButtonGroup";
import { Icon } from "../../shared/ui/Icon/Icon";
import { listApi } from "./listApi";
import { useAction } from "../../shared/api/useAction";

export function ListDialog({ list, onClose }: { list?: List; onClose: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useAction((value: z.input<typeof listInputSchema>) =>
    list ? listApi.update(list.id, value) : listApi.create(value),
  );
  const remove = useAction(async () => {
    if (list) await listApi.remove(list.id);
    onClose();
    navigate("/");
  });
  const {
    form,
    busy: saving,
    error,
    submit,
  } = useValidatedForm(
    {
      name: list?.name ?? "",
      description: list?.description ?? "",
      icon: list?.icon ?? "shop",
      color: list?.color ?? DEFAULT_LIST_COLOR,
    },
    listInputSchema.required(),
    async (value) => {
      await save.mutateAsync(value);
      onClose();
    },
  );
  useErrorSnackbar(error ?? remove.error);
  const busy = saving || remove.isPending;
  return (
    <Dialog
      title={confirmDelete ? "Diese Liste löschen?" : list ? "Listendetails" : "Neue Liste"}
      eyebrow={list?.name}
      busy={busy}
      onClose={onClose}
      onSubmit={(event) => {
        if (busy || confirmDelete) event.preventDefault();
        if (busy) return;
        if (confirmDelete) remove.mutate(undefined);
        else submit(event);
      }}
    >
      {confirmDelete ? (
        <p>„{list?.name}“ und alle Einträge werden endgültig gelöscht.</p>
      ) : (
        <>
          <form.Field name="name">
            {(field) => (
              <TextField {...textFieldProps(field)} label="Listenname" required disabled={busy} />
            )}
          </form.Field>
          <form.Field name="description">
            {(field) => (
              <TextField
                {...textFieldProps(field)}
                label="Beschreibung"
                multiline
                placeholder="Wofür ist diese Liste?"
                disabled={busy}
              />
            )}
          </form.Field>
          <form.Field name="icon">
            {(field) => (
              <ToggleButtonGroup
                label="Symbol"
                value={field.state.value}
                error={fieldError(field)}
                onBlur={field.handleBlur}
                onValueChange={(value) => field.handleChange(iconSchema.parse(value))}
                disabled={busy}
                options={iconSchema.options.map((value) => ({
                  value,
                  label: {
                    shop: "Einkauf",
                    home: "Zuhause",
                    travel: "Reise",
                    tools: "Werkzeug",
                    heart: "Herz",
                    cart: "Einkaufswagen",
                    bubbles: "Seifenblasen",
                    cleaning: "Putzen",
                    city: "Innenstadt",
                    rice: "Asia-Supermarkt",
                    sewing: "Nähen",
                  }[value],
                  icon: <Icon name={value} className="list-symbol-choice" />,
                }))}
              />
            )}
          </form.Field>
          <form.Field name="color">
            {(field) => (
              <ColorPicker
                value={field.state.value}
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                error={fieldError(field)}
                disabled={busy}
              />
            )}
          </form.Field>
        </>
      )}
      {list && !confirmDelete ? (
        <section className="list-delete-section" aria-label="Liste löschen">
          <h3>Liste löschen</h3>
          <p>Die Liste und alle Einträge werden unwiderruflich entfernt.</p>
          <Button variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" />
            Liste löschen
          </Button>
        </section>
      ) : null}
      <div className="dialog-actions">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => (confirmDelete ? setConfirmDelete(false) : onClose())}
        >
          Abbrechen
        </Button>
        <Button variant={confirmDelete ? "danger" : "primary"} type="submit" loading={busy}>
          {confirmDelete ? <Icon name="trash" /> : null}
          {confirmDelete ? "Liste löschen" : list ? "Änderungen speichern" : "Liste erstellen"}
        </Button>
      </div>
    </Dialog>
  );
}
