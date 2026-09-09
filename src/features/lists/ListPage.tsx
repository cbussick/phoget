import { Callout } from "../../shared/ui/Callout/Callout";
import { useState } from "react";
import type { Item, List } from "../../../shared/contracts";
import { Link } from "../../app/navigation";
import { Button } from "../../shared/ui/Button/Button";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Icon } from "../../shared/ui/Icon/Icon";
import { ListIcon } from "../../shared/ui/ListIcon/ListIcon";
import { ItemRow } from "./ItemRow";
import { ItemDialog } from "./ItemDialog";
import { ListDialog } from "./ListDialog";
import { AddItemForm } from "./AddItemForm";

import { listActivityLabel, useActivityClock } from "../../shared/ui/listActivity";
export function ListPage({
  list,
  items,
  syncError,
}: {
  list: List;
  items: Item[];
  syncError: boolean;
}) {
  const now = useActivityClock();
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
          Alle Listen
        </Link>
        <ListIcon name={list.icon} color={list.color} />
        <div className="title-row">
          <div>
            <h1>{list.name}</h1>
            <p className="list-meta">
              <time
                dateTime={list.updatedAt}
                title={new Date(list.updatedAt).toLocaleString("de-DE")}
              >
                {listActivityLabel(list.updatedAt, list.updatedBy, now)}
              </time>
            </p>
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="icon-button"
            aria-label="Weitere Optionen"
            onClick={() => setOptions(true)}
          >
            <Icon name="more" />
          </Button>
        </div>
      </header>
      <section className="list-card" aria-labelledby="list-title">
        <h2 id="list-title" className="visually-hidden">
          Offene Einträge
        </h2>
        <AddItemForm listId={list.id} color={list.color} onAnnounce={setAnnouncement} />
        <ul className="items active-items">{active.map(renderItem)}</ul>
        {!active.length ? (
          <EmptyState
            title={completed.length ? "Alles erledigt!" : "Hier ist noch nichts"}
            description={
              completed.length
                ? "Alles auf dieser Liste ist erledigt. Genieße die kleine Pause."
                : "Füge oben deinen ersten Eintrag hinzu. Gemeinsam behalten wir den Überblick."
            }
            icon={completed.length ? "complete" : "emptyList"}
          />
        ) : null}
        {completed.length > 0 ? (
          <details className="completed-items">
            <summary>
              <span className="completed-heading">
                <Icon name="chevronDown" />
                Erledigt
              </span>
              <span className="completed-count">
                {completed.length} {completed.length === 1 ? "Eintrag" : "Einträge"}
              </span>
            </summary>
            <ul className="items">{completed.map(renderItem)}</ul>
          </details>
        ) : null}
      </section>
      {syncError ? (
        <Callout>Verbindung unterbrochen. Die zuletzt gespeicherte Version wird angezeigt.</Callout>
      ) : null}
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
