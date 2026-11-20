import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, userEvent, within } from "storybook/test";
import { AddFriendSearch } from "./add-friend-search";

const found = { id: 7, nickname: "재즈냥", profileImageUrl: null };

const meta = {
  title: "Features/Friendship/AddFriendSearch",
  component: AddFriendSearch,
  tags: ["autodocs"],
  args: { currentUserId: 1, onClose: fn() },
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
} satisfies Meta<typeof AddFriendSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Found: Story = {
  parameters: { queries: [[["user", "search", "재즈냥"], found]] },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole("textbox"), "재즈냥");
  },
};

export const Self: Story = {
  args: { currentUserId: 7 },
  parameters: { queries: [[["user", "search", "재즈냥"], found]] },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole("textbox"), "재즈냥");
  },
};
