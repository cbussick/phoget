import { Checkbox } from "../../shared/ui/Checkbox/Checkbox";
import type { Item } from "../../../shared/contracts";
import { Button } from "../../shared/ui/Button/Button";
import { useErrorSnackbar } from "../../shared/ui/Snackbar/useErrorSnackbar";
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
    onAnnounce(
      item.name + (completed ? " als erledigt markiert" : " zurück auf die Liste verschoben"),
    );
  });
  useErrorSnackbar(toggle.error);
  return (
    <li className={"item-row" + (item.completed ? " is-complete" : "")}>
      <hr className="item-divider" aria-hidden="true" />
      <Button variant="ghost" size="content" className="item-details" onClick={() => onEdit(item)}>
        <span className="item-copy">
          <span className="item-name">{item.name}</span>
          {item.note ? <span className="item-note">{item.note}</span> : null}
        </span>
      </Button>
      <Checkbox
        label={item.name + (item.completed ? " als offen markieren" : " als erledigt markieren")}
        checked={toggle.isPending ? toggle.variables : item.completed}
        disabled={toggle.isPending}
        onChange={(event) => {
          const completed = event.target.checked;
          toggle.mutate(completed);
        }}
      />
    </li>
  );
}
