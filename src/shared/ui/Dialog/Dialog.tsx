import "./Dialog.css";
import { useEffect, useId, useRef, type ReactNode, type FormEventHandler } from "react";
import { Button } from "../Button/Button";
export function Dialog({
  title,
  eyebrow,
  onClose,
  onSubmit,
  children,
  busy = false,
  spacious = false,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  busy?: boolean;
  spacious?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"item-dialog" + (spacious ? " item-dialog-spacious" : "")}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busy) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onClose();
      }}
    >
      <form noValidate onSubmit={onSubmit}>
        <div className="dialog-heading">
          <div>
            {eyebrow ? <p>{eyebrow}</p> : null}
            <h2 id={titleId}>{title}</h2>
          </div>
          <Button
            variant="ghost"
            className="dialog-close"
            aria-label="Dialog schließen"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </Button>
        </div>
        {children}
      </form>
    </dialog>
  );
}
