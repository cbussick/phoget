import type { Meta, StoryObj } from "@storybook/react-vite";
import { Table } from "./Table";
import { Button } from "../Button/Button";
import { Badge } from "../Badge/Badge";
const meta = {
  title: "Components/Table",
  component: Table,
  args: {
    caption: "Household users",
    columns: ["Name", "Username", "Role", "Actions"],
    children: (
      <>
        <tr>
          <td>Morgan</td>
          <td>morgan</td>
          <td>
            <Badge tone="accent">Admin</Badge>
          </td>
          <td>
            <Button variant="secondary" size="compact">
              Edit Morgan
            </Button>
          </td>
        </tr>
        <tr>
          <td>Jamie</td>
          <td>jamie</td>
          <td>
            <Badge>User</Badge>
          </td>
          <td>
            <Button variant="secondary" size="compact">
              Edit Jamie
            </Button>
          </td>
        </tr>
      </>
    ),
  },
} satisfies Meta<typeof Table>;
export default meta;
export const Users: StoryObj<typeof meta> = {};
