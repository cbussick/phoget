import { useState } from "react";
import { iconSchema, type List } from "../../../shared/contracts";
import { navigate } from "../../app/navigation";
import { Dialog } from "../../shared/ui/Dialog";
import { Field } from "../../shared/ui/Field";
import { Feedback } from "../../shared/ui/Feedback";
import { Button } from "../../shared/ui/Button";
import { Icon } from "../../shared/ui/Icon";
import { listApi } from "./listApi";
import { useAction } from "../../shared/api/useAction";
export function ListDialog({ list, onClose }: { list?: List; onClose: () => void }) {
  const [name, setName] = useState(list?.name ?? "");
  const [description, setDescription] = useState(list?.description ?? "");
  const [icon, setIcon] = useState(list?.icon ?? "shop");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useAction(async () =>
    list
      ? listApi.update(list.id, { name, description, icon })
      : listApi.create({ name, description, icon }),
  );
  const remove = useAction(async () => {
    if (list) await listApi.remove(list.id);
  });
  const busy = save.isPending || remove.isPending;
  return (
    <Dialog
      title={confirmDelete ? "Delete this list?" : list ? "List details" : "New list"}
      eyebrow={list?.name}
      busy={busy}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        if (confirmDelete)
          remove.mutate(undefined, {
            onSuccess: () => {
              onClose();
              navigate("/");
            },
          });
        else save.mutate(undefined, { onSuccess: onClose });
      }}
    >
      {confirmDelete ? (
        <p>This will permanently remove “{list?.name}” and all its items.</p>
      ) : (
        <>
          <Field
            label="List name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={200}
          />
          <Field
            label="Description"
            name="description"
            multiline
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            placeholder="What is this list for?"
          />
          <fieldset className="icon-picker">
            <legend>Icon</legend>
            {iconSchema.options.map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="icon"
                  value={value}
                  checked={icon === value}
                  onChange={() => setIcon(value)}
                />
                <Icon name={value} />
                <span className="visually-hidden">{value}</span>
              </label>
            ))}
          </fieldset>
        </>
      )}
      <Feedback error={save.error ?? remove.error} />
      <div className="dialog-actions">
        <Button
          className="remove-item"
          disabled={busy}
          onClick={() =>
            confirmDelete ? setConfirmDelete(false) : list ? setConfirmDelete(true) : onClose()
          }
        >
          {confirmDelete || !list ? "Cancel" : "Delete list"}
        </Button>
        <Button
          className={confirmDelete ? "remove-item danger" : "save-item"}
          type="submit"
          disabled={busy}
        >
          {busy ? "Saving…" : confirmDelete ? "Delete list" : list ? "Save changes" : "Create list"}
        </Button>
      </div>
    </Dialog>
  );
}
