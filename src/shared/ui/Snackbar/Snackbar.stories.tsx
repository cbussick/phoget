import type { Meta, StoryObj } from "@storybook/react-vite";
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
