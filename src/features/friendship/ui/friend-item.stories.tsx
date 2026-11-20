import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { FriendItem } from "./friend-item";

const meta = {
  title: "Features/Friendship/FriendItem",
  component: FriendItem,
  tags: ["autodocs"],
  args: { friendshipId: 1, name: "코드왕" },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof FriendItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On desktop the remove button only shows on hover. */
export const Default: Story = {};

export const LongName: Story = { args: { name: "세상에서가장긴닉네임을가진재즈피아니스트" } };

/** After the first tap: the button asks for confirmation (and reverts after 3s). */
export const Confirming: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
  },
};
