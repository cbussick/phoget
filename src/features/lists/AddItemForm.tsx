import { useRef, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Icon } from "../../shared/ui/Icon";
import { Feedback } from "../../shared/ui/Feedback";
import { listApi } from "./listApi";
import { useAction } from "../../shared/api/useAction";

export function AddItemForm({
  listId,
  suggestions,
  onAnnounce,
}: {
  listId: string;
  suggestions: string[];
  onAnnounce: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const add = useAction((value: string) => listApi.addItem(listId, { name: value }));
  function submit(value: string, fromInput: boolean) {
    if (add.isPending) return;
    add.mutate(value, {
      onSuccess: () => {
        if (fromInput) {
          setName("");
          input.current?.focus();
        }
        onAnnounce(value + " added to the list");
      },
    });
  }
  return (
    <>
      <form
        className="add-item-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(name, true);
        }}
      >
        <label className="visually-hidden" htmlFor="new-item">
          Add an item
        </label>
        <input
          ref={input}
          id="new-item"
          name="item"
          value={name}
          onChange={(event) => setName(event.target.value)}
          type="text"
          placeholder="Add an item…"
          autoComplete="off"
          required
          maxLength={200}
          readOnly={add.isPending}
        />
        <Button type="submit" disabled={add.isPending}>
          <Icon name="plus" />
          Add
        </Button>
      </form>
      {suggestions.length ? (
        <div className="quick-add" role="group" aria-label="Quick add suggestions">
          <span>Often bought</span>
          {suggestions.map((suggestion, index) => (
            <Button key={index} disabled={add.isPending} onClick={() => submit(suggestion, false)}>
              + {suggestion}
            </Button>
          ))}
        </div>
      ) : null}
      <Feedback error={add.error} />
    </>
  );
}
