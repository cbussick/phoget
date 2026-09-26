import { useEffect, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useQueryClient } from "@tanstack/react-query";
import { householdKey } from "../../shared/api/queryKeys";
import { useErrorSnackbar } from "../../shared/ui/Snackbar/useErrorSnackbar";
import "./sortableRows.css";

export function SortableRow({
  id,
  label,
  children,
  className = "",
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      className={`${className} sortable-row${isDragging ? " is-dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: "relative",
        zIndex: isDragging ? 2 : undefined,
      }}
      onMouseDown={(event) => listeners?.onMouseDown?.(event)}
    >
      <button
        type="button"
        className="sort-handle"
        ref={setActivatorNodeRef}
        {...attributes}
        onKeyDown={(event) => listeners?.onKeyDown?.(event)}
        onTouchStart={(event) => listeners?.onTouchStart?.(event)}
        aria-label={`${label} verschieben`}
        onClick={(event) => event.preventDefault()}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="9" r="1" />
          <circle cx="19" cy="9" r="1" />
          <circle cx="5" cy="9" r="1" />
          <circle cx="12" cy="15" r="1" />
          <circle cx="19" cy="15" r="1" />
          <circle cx="5" cy="15" r="1" />
        </svg>
      </button>
      {children}
    </li>
  );
}

export function SortableRows<T extends { id: string }>({
  rows,
  className,
  save,
  renderRow,
  getLabel,
}: {
  rows: T[];
  className: string;
  save: (before: string[], after: string[]) => Promise<unknown>;
  renderRow: (row: T) => ReactNode;
  getLabel: (row: T) => string;
}) {
  const [order, setOrder] = useState<string[]>(() => rows.map((row) => row.id));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const ids = rows.map((row) => row.id);
  const signature = ids.join("|");
  useEffect(() => {
    if (!busy) setOrder(ids);
  }, [signature, busy]); // Server order is authoritative after sync.
  useErrorSnackbar(error);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  const visible = order.filter((id) => byId.has(id));
  for (const id of ids) if (!visible.includes(id)) visible.push(id);
  async function finish(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || busy) return;
    const before = visible;
    const after = arrayMove(
      before,
      before.indexOf(String(active.id)),
      before.indexOf(String(over.id)),
    );
    setOrder(after);
    setBusy(true);
    setError(null);
    try {
      await save(before, after);
    } catch (failure) {
      setOrder(before);
      setError(
        failure instanceof Error
          ? failure.message
          : "Die Reihenfolge konnte nicht gespeichert werden.",
      );
    } finally {
      await client.invalidateQueries({ queryKey: householdKey });
      setBusy(false);
    }
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={finish}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Leertaste zum Aufnehmen, Pfeiltasten zum Verschieben, Leertaste zum Ablegen, Escape zum Abbrechen.",
        },
        announcements: {
          onDragStart: ({ active }) => `${getLabel(byId.get(String(active.id))!)} aufgenommen.`,
          onDragOver: ({ over }) =>
            over ? `Über Position ${visible.indexOf(String(over.id)) + 1}.` : "",
          onDragEnd: ({ active, over }) =>
            over
              ? `${getLabel(byId.get(String(active.id))!)} an Position ${visible.indexOf(String(over.id)) + 1} abgelegt.`
              : "Verschieben abgebrochen.",
          onDragCancel: () => "Verschieben abgebrochen.",
        },
      }}
    >
      <SortableContext items={visible} strategy={verticalListSortingStrategy}>
        <ul className={className}>{visible.map((id) => renderRow(byId.get(id)!))}</ul>
      </SortableContext>
    </DndContext>
  );
}
