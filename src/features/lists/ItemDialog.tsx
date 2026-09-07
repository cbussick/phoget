import { useState } from "react";
import type { Item } from "../../../shared/contracts";
import { Dialog } from "../../shared/ui/Dialog";
import { Field } from "../../shared/ui/Field";
import { Button } from "../../shared/ui/Button";
import { Feedback } from "../../shared/ui/Feedback";
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
  const [name, setName] = useState(item.name);
  const [note, setNote] = useState(item.note);
  const save = useAction(() => listApi.editItem(item.id, { name, note }));
  const remove = useAction(() => listApi.removeItem(item.id));
  const busy = save.isPending || remove.isPending;
  return (
    <Dialog
      title={item.name}
      eyebrow="Edit item"
      onClose={onClose}
      busy={busy}
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        save.mutate(undefined, {
          onSuccess: () => {
            onAnnounce(name + " updated");
            onClose();
          },
        });
      }}
    >
      <Field
        label="Item"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        maxLength={200}
      />
      <Field
        label="Note"
        name="note"
        multiline
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={2000}
        placeholder="Add a useful detail…"
      />
      <Feedback error={save.error ?? remove.error} />
      <div className="dialog-actions">
        <Button
          className="remove-item"
          disabled={busy}
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => {
                onAnnounce(item.name + " removed");
                onClose();
              },
            })
          }
        >
          Remove item
        </Button>
        <Button className="save-item" type="submit" disabled={busy}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Dialog>
  );
}
