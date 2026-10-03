import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import "sonner/dist/styles.css";
import { Button } from "../Button/Button";
import { Callout } from "../Callout/Callout";
import "./Snackbar.css";

export const snackbarDurationMs = 5000;
export type SnackbarVariant = "success" | "error" | "info";
export type SnackbarAction = { label: string; onClick: () => void };
const SnackbarContext = createContext<
  ((message: string, variant?: SnackbarVariant, action?: SnackbarAction) => void) | null
>(null);

export function useSnackbar() {
  const notify = useContext(SnackbarContext);
  if (!notify) throw new Error("useSnackbar requires SnackbarProvider");
  return notify;
}

const desktopOffset = {
  bottom: "calc(var(--space-5) + env(safe-area-inset-bottom, 0px))",
  left: "var(--space-4)",
  right: "var(--space-4)",
};
const mobileOffset = {
  bottom: "calc(var(--mobile-nav-height) + var(--space-5) + env(safe-area-inset-bottom, 0px))",
  left: "var(--space-4)",
  right: "var(--space-4)",
};

function promoteToaster() {
  requestAnimationFrame(() => {
    const toaster = document.querySelector<HTMLElement>(".snackbar-toaster");
    if (!toaster?.showPopover) return;
    toaster.setAttribute("popover", "manual");
    if (toaster.matches(":popover-open")) toaster.hidePopover();
    toaster.showPopover();
  });
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  useEffect(() => promoteToaster(), []);
  const notify = useCallback(
    (text: string, variant: SnackbarVariant = "success", action?: SnackbarAction) => {
      toast.custom(
        (id) => {
          const content = (
            <div className="snackbar-content">
              <span className="snackbar-text">{text}</span>
              {action ? (
                <Button
                  variant="ghost"
                  size="compact"
                  className="snackbar-action"
                  onClick={() => {
                    toast.dismiss(id);
                    action.onClick();
                  }}
                >
                  {action.label}
                </Button>
              ) : null}
            </div>
          );
          return (
            <div
              className="snackbar"
              data-variant={variant}
              role="region"
              aria-label="Benachrichtigung"
            >
              {variant === "error" ? (
                <Callout className="snackbar-callout" announce={false}>
                  {content}
                </Callout>
              ) : (
                <div className="snackbar-message">{content}</div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="snackbar-dismiss"
                aria-label="Meldung schließen"
                onClick={() => toast.dismiss(id)}
              >
                ×
              </Button>
            </div>
          );
        },
        { duration: snackbarDurationMs, className: "snackbar-item" },
      );
      promoteToaster();
    },
    [],
  );

  return (
    <SnackbarContext.Provider value={notify}>
      {children}
      <Toaster
        className="snackbar-toaster"
        position="bottom-center"
        swipeDirections={["left", "right", "bottom"]}
        visibleToasts={3}
        gap={10}
        offset={desktopOffset}
        mobileOffset={mobileOffset}
        duration={snackbarDurationMs}
        expand
        richColors={false}
        closeButton={false}
      />
    </SnackbarContext.Provider>
  );
}
