import { useState } from "react";
import { Tabs, TabList, Tab, TabPanel } from "react-aria-components";
import type { Item, List } from "../../../shared/contracts";
import { Link } from "../../app/navigation";
import { Button } from "../../shared/ui/Button/Button";
import { accentColorStyle } from "../../shared/ui/accentColor";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Icon } from "../../shared/ui/Icon/Icon";
import { ListIcon } from "../../shared/ui/ListIcon/ListIcon";
import { ItemRow } from "./ItemRow";
import { ItemDialog } from "./ItemDialog";
import { ListDialog } from "./ListDialog";
import { AddItemForm } from "./AddItemForm";
import { useSuggestions, SuggestionsDialog } from "./Suggestions";
import { SortableRow, SortableRows } from "./SortableRows";
import { listApi } from "./listApi";
import { useErrorSnackbar } from "../../shared/ui/Snackbar/useErrorSnackbar";

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
  const [manageSuggestions, setManageSuggestions] = useState(false);
  const suggestions = useSuggestions(list.id, items, manageSuggestions);
  const [announcement, setAnnouncement] = useState("");
  const active = items.filter((item) => !item.completed);
  const completed = items.filter((item) => item.completed);
  useErrorSnackbar(
    syncError ? "Verbindung unterbrochen. Die zuletzt gespeicherte Version wird angezeigt." : null,
  );
  const renderItem = (item: Item) => (
    <SortableRow
      key={item.id}
      id={item.id}
      label={item.name}
      className={"item-row" + (item.completed ? " is-complete" : "")}
    >
      <ItemRow item={item} onEdit={setSelected} onAnnounce={setAnnouncement} />
    </SortableRow>
  );
  return (
    <>
      <Tabs key={list.id} className="list-tabs" defaultSelectedKey="open">
        <div className="list-controls">
          <header className="page-header">
            <Link className="back-link" href="/">
              <Icon name="back" />
              Alle Listen
            </Link>
            <ListIcon name={list.icon} color={list.color} />
            <div className="title-row">
              <div>
                <h1 title={list.name}>{list.name}</h1>
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
          <div className="list-card list-composer">
            <AddItemForm
              listId={list.id}
              color={list.color}
              onAnnounce={setAnnouncement}
              suggestionState={suggestions}
            />
            <TabList
              className="list-status-tab-list"
              aria-label="Eintragsstatus"
              style={accentColorStyle(list.color)}
            >
              <Tab id="open" className="list-status-tab">
                Offen <span className="list-tab-count">{active.length}</span>
              </Tab>
              <Tab id="completed" className="list-status-tab">
                Erledigt <span className="list-tab-count">{completed.length}</span>
              </Tab>
            </TabList>
          </div>
        </div>
        <TabPanel id="open" className="list-card list-items-card">
          <h2 className="visually-hidden">Offene Einträge</h2>
          <SortableRows
            getLabel={(item) => item.name}
            rows={active}
            className="items active-items"
            save={(before, after) => listApi.reorderItems(list.id, "open", { before, after })}
            renderRow={renderItem}
          />
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
        </TabPanel>
        <TabPanel id="completed" className="list-card list-items-card">
          <h2 className="visually-hidden">Erledigte Einträge</h2>
          <SortableRows
            getLabel={(item) => item.name}
            rows={completed}
            className="items completed-items"
            save={(before, after) => listApi.reorderItems(list.id, "completed", { before, after })}
            renderRow={renderItem}
          />
          {!completed.length ? (
            <EmptyState
              title="Noch nichts erledigt"
              description="Abgehakte Einträge erscheinen hier. Du kannst sie jederzeit wieder öffnen."
              icon="complete"
            />
          ) : null}
        </TabPanel>
      </Tabs>
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
      {options ? (
        <ListDialog
          list={list}
          onClose={() => setOptions(false)}
          onManageSuggestions={() => {
            setOptions(false);
            setManageSuggestions(true);
          }}
        />
      ) : null}
      {manageSuggestions ? (
        <SuggestionsDialog
          names={suggestions.names}
          busy={suggestions.busy}
          loading={suggestions.history.isPending}
          error={suggestions.history.isError}
          undo={suggestions.undo}
          onForget={suggestions.forget}
          onClose={() => setManageSuggestions(false)}
        />
      ) : null}
      {suggestions.confirmationDialog}
    </>
  );
}

import "./lists.css";
