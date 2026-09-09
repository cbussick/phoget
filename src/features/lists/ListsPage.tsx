import { useState } from "react";
import type { List } from "../../../shared/contracts";
import { Link } from "../../app/navigation";
import { Button } from "../../shared/ui/Button/Button";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Icon } from "../../shared/ui/Icon/Icon";
import { ListRow } from "../../shared/ui/ListRow/ListRow";
import { listActivityLabel, useActivityClock } from "../../shared/ui/listActivity";
import { ListDialog } from "./ListDialog";
export function ListsPage({ lists }: { lists: List[] }) {
  const now = useActivityClock();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <header className="lists-header">
        <div>
          <h1>Alle Listen</h1>
          <p>Alles, was ihr gemeinsam im Blick behaltet.</p>
        </div>
        <Button
          variant="primary"
          size="large"
          className="new-list-button"
          onClick={() => setCreating(true)}
        >
          <Icon name="plus" />
          Neue Liste
        </Button>
      </header>
      <section className="lists-card" aria-labelledby="your-lists-title">
        <h2 id="your-lists-title" className="visually-hidden">
          Eure Listen
        </h2>
        {lists.length ? (
          <ul className="list-overview">
            {lists.map((list) => (
              <li key={list.id}>
                <ListRow
                  linkComponent={Link}
                  href={"/lists/" + list.id}
                  icon={list.icon}
                  color={list.color}
                  name={list.name}
                  description={list.description}
                  activity={listActivityLabel(list.updatedAt, list.updatedBy, now)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Noch keine Listen"
            description="Erstelle eine Liste, damit ihr gemeinsam den Überblick behaltet."
          />
        )}
      </section>
      {creating ? <ListDialog onClose={() => setCreating(false)} /> : null}
    </>
  );
}

import "./lists.css";
