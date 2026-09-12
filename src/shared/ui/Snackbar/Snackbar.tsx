import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import "sonner/dist/styles.css";
import { Button } from "../Button/Button";
import { Callout } from "../Callout/Callout";
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
  const notify = useCallback((text: string, variant: SnackbarVariant = "success") => {
    toast.custom(
      (id) => (
        <div
          className="snackbar"
          data-variant={variant}
          role="region"
          aria-label="Benachrichtigung"
        >
          {variant === "error" ? (
            <Callout className="snackbar-callout" announce={false}>
              {text}
            </Callout>
          ) : (
            <div className="snackbar-message">{text}</div>
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
      ),
      { duration: Infinity, className: "snackbar-item" },
    );
    promoteToaster();
  }, []);

  return (
    <SnackbarContext.Provider value={notify}>
      {children}
      <Toaster
        className="snackbar-toaster"
        position="bottom-center"
        visibleToasts={3}
        gap={10}
        offset={desktopOffset}
        mobileOffset={mobileOffset}
        duration={Infinity}
        expand
        richColors={false}
        closeButton={false}
      />
    </SnackbarContext.Provider>
  );
}
