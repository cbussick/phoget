import { database, pool } from "./database.js";
import { lists, items } from "./schema.js";

const demoLists = [
  {
    id: "b4d6cd64-087f-5527-8551-2f47d3f753b7",
    name: "Weekly shop",
    description: "Groceries and household staples for the week.",
    icon: "shop",
  },
  {
    id: "fdfcd72c-a785-5fde-9ce4-1fe70ac62bac",
    name: "Things for the apartment",
    description: "Small upgrades, replacements, and things to fix.",
    icon: "home",
  },
  {
    id: "835f6d22-1eab-59e3-a136-c083b74f6bab",
    name: "Weekend away",
    description: "What to pack before we head to the coast.",
    icon: "travel",
  },
  {
    id: "82763ebc-12b8-59f0-bf1b-2b60c12a812a",
    name: "DIY jobs",
    description: "Repairs and weekend projects around the apartment.",
    icon: "tools",
  },
  {
    id: "b8e600a2-3e1c-5369-8912-18718ded3af4",
    name: "Someday",
    description: "Ideas we like but do not need to decide on yet.",
    icon: "heart",
  },
];
const demoItems = [
  {
    id: "fd1d2f27-3730-58c6-92c6-f8ec808ef06b",
    listId: "b4d6cd64-087f-5527-8551-2f47d3f753b7",
    name: "2 packs of cherry tomatoes",
    note: "The sweet mini ones, not plum tomatoes",
    completed: false,
  },
  {
    id: "d8f00534-b857-5edc-9151-380ca1d1222b",
    listId: "b4d6cd64-087f-5527-8551-2f47d3f753b7",
    name: "3 avocados",
    note: "",
    completed: false,
  },
  {
    id: "d9b38f0f-5976-57af-b371-2670d533a6d1",
    listId: "b4d6cd64-087f-5527-8551-2f47d3f753b7",
    name: "2 lemons",
    note: "",
    completed: false,
  },
  {
    id: "5653d8bd-3f06-55f0-8b9c-2152a4b4a4b3",
    listId: "b4d6cd64-087f-5527-8551-2f47d3f753b7",
    name: "2 cartons of oat milk",
    note: "",
    completed: false,
  },
  {
    id: "43a487e6-f22a-5a24-a8f8-e131d0cbed31",
    listId: "b4d6cd64-087f-5527-8551-2f47d3f753b7",
    name: "Halloumi",
    note: "",
    completed: false,
  },
  {
    id: "c6e0295a-b337-58b6-a96f-3e0a7188916f",
    listId: "b4d6cd64-087f-5527-8551-2f47d3f753b7",
    name: "500 g Greek yoghurt",
    note: "",
    completed: false,
  },
  {
    id: "812bd0b2-b08d-54ad-84ee-4c738eafce38",
    listId: "b4d6cd64-087f-5527-8551-2f47d3f753b7",
    name: "1 pack of rigatoni",
    note: "",
    completed: false,
  },
  {
    id: "28a60f67-c565-5a7c-b1b7-842456554201",
    listId: "b4d6cd64-087f-5527-8551-2f47d3f753b7",
    name: "1 bottle of olive oil",
    note: "",
    completed: false,
  },
  {
    id: "02206f42-b586-5cb3-8f76-14c3e9d63d10",
    listId: "b4d6cd64-087f-5527-8551-2f47d3f753b7",
    name: "1 loaf of sourdough bread",
    note: "",
    completed: true,
  },
  {
    id: "1c9554b4-aa41-58c0-a588-a7ae2d988d02",
    listId: "b4d6cd64-087f-5527-8551-2f47d3f753b7",
    name: "12 eggs",
    note: "",
    completed: true,
  },
];
try {
  await database.transaction(async (transaction) => {
    for (const [index, list] of demoLists.entries())
      await transaction
        .insert(lists)
        .values({ ...list, createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString() })
        .onConflictDoNothing();
    for (const [index, item] of demoItems.entries())
      await transaction
        .insert(items)
        .values({ ...item, createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString() })
        .onConflictDoNothing();
  });
  console.log("Prototype sample data added.");
} finally {
  await pool.end();
}
