import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog } from "./Dialog";
import { Button } from "../Button/Button";
import { TextField } from "../TextField/TextField";
function DialogExample() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      {saved ? <p role="status">Changes saved.</p> : null}
      {open ? (
        <Dialog
          title="List details"
          eyebrow="Weekly shop"
          onClose={() => setOpen(false)}
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
            setOpen(false);
          }}
        >
          <TextField label="List name" defaultValue="Weekly shop" required />
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save changes
            </Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
const meta = {
  title: "Components/Dialog",
  component: Dialog,
  args: { title: "List details", onClose: () => {}, onSubmit: () => {}, children: null },
  render: () => <DialogExample />,
} satisfies Meta<typeof Dialog>;
export default meta;
export const Interactive: StoryObj<typeof meta> = {};
