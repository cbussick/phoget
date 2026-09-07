import type { Item } from "../../../shared/contracts";
import { Button } from "../../shared/ui/Button";
import { Feedback } from "../../shared/ui/Feedback";
import { listApi } from "./listApi";
import { useAction } from "../../shared/api/useAction";

export function ItemRow({
  item,
  onEdit,
  onAnnounce,
}: {
  item: Item;
  onEdit: (item: Item) => void;
  onAnnounce: (message: string) => void;
}) {
  const toggle = useAction(async (completed: boolean) => {
    await listApi.editItem(item.id, { completed });
    onAnnounce(item.name + (completed ? " marked done" : " moved back to the list"));
  });
  return (
    <li className={"item-row" + (item.completed ? " is-complete" : "")}>
      <Button className="item-details" onClick={() => onEdit(item)}>
        <span className="item-copy">
          <span className="item-name">{item.name}</span>
          {item.note ? <span className="item-note">{item.note}</span> : null}
        </span>
      </Button>
      <label className="checkbox-label">
        <span className="visually-hidden">
          Mark {item.name} {item.completed ? "not done" : "done"}
        </span>
        <input
          type="checkbox"
          checked={toggle.isPending ? toggle.variables : item.completed}
          disabled={toggle.isPending}
          onChange={(event) => {
            const completed = event.target.checked;
            toggle.mutate(completed);
          }}
        />
      </label>
      <Feedback error={toggle.error} />
    </li>
  );
}
