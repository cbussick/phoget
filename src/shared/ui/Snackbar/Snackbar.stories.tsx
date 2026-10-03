import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SnackbarProvider, useSnackbar, type SnackbarVariant } from "./Snackbar";
import { Button } from "../Button/Button";

function Preview({ variant = "success" }: { variant?: SnackbarVariant }) {
  const notify = useSnackbar();
  return (
    <Button
      onClick={() =>
        notify(
          {
            success: "Einstellungen gespeichert.",
            error: "Die Aktion konnte nicht ausgeführt werden.",
            info: "Änderungen werden automatisch geteilt.",
          }[variant],
          variant,
        )
      }
    >
      Meldung anzeigen
    </Button>
  );
}
function UndoPreview() {
  const notify = useSnackbar();
  const [undoCount, setUndoCount] = useState(0);
  return (
    <>
      <Button
        onClick={() =>
          notify("Vorschlag entfernt.", "success", {
            label: "Rückgängig",
            onClick: () => setUndoCount((count) => count + 1),
          })
        }
      >
        Meldung anzeigen
      </Button>
      <p role="status">{undoCount} Mal rückgängig gemacht</p>
    </>
  );
}
const meta = {
  title: "Components/Snackbar",
  component: SnackbarProvider,
  args: { children: null },
  render: () => (
    <SnackbarProvider>
      <Preview />
    </SnackbarProvider>
  ),
} satisfies Meta<typeof SnackbarProvider>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const WithUndo: StoryObj<typeof meta> = {
  render: () => (
    <SnackbarProvider>
      <UndoPreview />
    </SnackbarProvider>
  ),
};
export const Error: StoryObj<typeof meta> = {
  render: () => (
    <SnackbarProvider>
      <Preview variant="error" />
    </SnackbarProvider>
  ),
};
export const Info: StoryObj<typeof meta> = {
  render: () => (
    <SnackbarProvider>
      <Preview variant="info" />
    </SnackbarProvider>
  ),
};
