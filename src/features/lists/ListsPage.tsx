import { useState } from "react";
import type { List } from "../../../shared/contracts";
import { Link } from "../../app/navigation";
import { Button } from "../../shared/ui/Button";
import { Icon } from "../../shared/ui/Icon";
import { ListDialog } from "./ListDialog";
export function ListsPage({ lists }: { lists: List[] }) {
  const [creating, setCreating] = useState(false);
  return (
    <>
      <header className="lists-header">
        <div>
          <h1>All lists</h1>
          <p>Everything the two of you are keeping track of.</p>
        </div>
        <Button className="new-list-button" onClick={() => setCreating(true)}>
          <Icon name="plus" />
          New list
        </Button>
      </header>
      <section className="lists-card" aria-labelledby="your-lists-title">
        <h2 id="your-lists-title" className="visually-hidden">
          Your lists
        </h2>
        {lists.length ? (
          <ul className="list-overview">
            {lists.map((list) => (
              <li key={list.id}>
                <Link href={"/lists/" + list.id}>
                  <span className="list-icon" aria-hidden="true">
                    <Icon name={list.icon} />
                  </span>
                  <span className="list-copy">
                    <strong>{list.name}</strong>
                    <span>{list.description}</span>
                  </span>
                  <Icon className="list-arrow" name="arrow" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            No lists yet. Create a list to start keeping track together.
          </p>
        )}
      </section>
      {creating ? <ListDialog onClose={() => setCreating(false)} /> : null}
    </>
  );
}

import "./lists.css";
