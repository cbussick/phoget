import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import "./Snackbar.css";

export type SnackbarVariant = "success" | "error" | "info";
const SnackbarContext = createContext<
  ((message: string, variant?: SnackbarVariant) => void) | null
>(null);

export function useSnackbar() {
  const notify = useContext(SnackbarContext);
  if (!notify) throw new Error("useSnackbar requires SnackbarProvider");
  return notify;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{
    text: string;
    id: number;
    variant: SnackbarVariant;
  } | null>(null);
  const sequence = useRef(0);
  const popup = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!message) return;
    const element = popup.current;
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Fixed positioning remains a fallback in browsers without native popovers.
    element?.showPopover?.();
    return () => {
      if (element?.hidePopover && element.matches(":popover-open")) element.hidePopover();
    };
  }, [message]);
  const dismiss = () => {
    if (popup.current?.contains(document.activeElement) && previousFocus.current?.isConnected) {
      previousFocus.current.focus();
    }
    setMessage(null);
  };
  return (
    <SnackbarContext.Provider
      value={(text, variant = "success") => setMessage({ text, variant, id: ++sequence.current })}
    >
      {children}
      <div role="status" aria-atomic="true" className="visually-hidden">
        {message && message.variant !== "error" ? (
          <span key={message.id}>{message.text}</span>
        ) : null}
      </div>
      <div
        role={message?.variant === "error" ? "alert" : undefined}
        aria-live="assertive"
        aria-atomic="true"
        className="visually-hidden"
      >
        {message?.variant === "error" ? <span key={message.id}>{message.text}</span> : null}
      </div>
      {message ? (
        <div
          ref={popup}
          popover="manual"
          className="snackbar"
          data-variant={message.variant}
          role="region"
          aria-label="Benachrichtigung"
        >
          <Icon
            name={
              message.variant === "success"
                ? "check"
                : message.variant === "error"
                  ? "error"
                  : "info"
            }
          />
          <span>{message.text}</span>
          <Button variant="ghost" size="icon" aria-label="Meldung schließen" onClick={dismiss}>
            ×
          </Button>
        </div>
      ) : null}
    </SnackbarContext.Provider>
  );
}
