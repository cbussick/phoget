import { useState } from "react";
import type { Item, List } from "../../../shared/contracts";
import { Link } from "../../app/navigation";
import { Button } from "../../shared/ui/Button";
import { Icon } from "../../shared/ui/Icon";
import { ItemRow } from "./ItemRow";
import { ItemDialog } from "./ItemDialog";
import { ListDialog } from "./ListDialog";
import { AddItemForm } from "./AddItemForm";

function updatedLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60)
    return "Updated " + minutes + " " + (minutes === 1 ? "minute" : "minutes") + " ago";
  return (
    "Updated " + new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  );
}
export function ListPage({
  list,
  items,
  suggestions,
  syncError,
}: {
  list: List;
  items: Item[];
  suggestions: string[];
  syncError: boolean;
}) {
  const [selected, setSelected] = useState<Item | null>(null);
  const [options, setOptions] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const active = items.filter((item) => !item.completed);
  const completed = items.filter((item) => item.completed);
  const renderItem = (item: Item) => (
    <ItemRow key={item.id} item={item} onEdit={setSelected} onAnnounce={setAnnouncement} />
  );
  return (
    <>
      <header className="page-header">
        <Link className="back-link" href="/">
          <Icon name="back" />
          All lists
        </Link>
        <div className="title-row">
          <div>
            <h1>{list.name}</h1>
            <p className="list-meta">{updatedLabel(list.updatedAt)}</p>
          </div>
          <Button
            className="icon-button"
            aria-label="More options"
            onClick={() => setOptions(true)}
          >
            <Icon name="more" />
          </Button>
        </div>
      </header>
      <section className="list-card" aria-labelledby="list-title">
        <h2 id="list-title" className="visually-hidden">
          Items to do
        </h2>
        <AddItemForm listId={list.id} suggestions={suggestions} onAnnounce={setAnnouncement} />
        <ul className="items active-items">{active.map(renderItem)}</ul>
        {!active.length ? (
          <p className="empty-state">
            {completed.length
              ? "All done! Add anything else you need above."
              : "Nothing here yet. Add your first item above."}
          </p>
        ) : null}
        <details className="completed-items">
          <summary>
            <span>Done</span>
            <span>
              {completed.length} {completed.length === 1 ? "item" : "items"}
            </span>
          </summary>
          <ul className="items">{completed.map(renderItem)}</ul>
        </details>
      </section>
      <p className="sync-note" role="status">
        <span aria-hidden="true">{syncError ? "!" : "✓"}</span>
        {syncError
          ? "Connection lost. Showing the last saved version."
          : "Changes are shared with your household"}
      </p>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {selected ? (
        <ItemDialog
          item={selected}
          onClose={() => setSelected(null)}
          onAnnounce={setAnnouncement}
        />
      ) : null}
      {options ? <ListDialog list={list} onClose={() => setOptions(false)} /> : null}
    </>
  );
}

import "./lists.css";
