import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FriendAvatar } from "./friend-avatar";

const meta = {
  title: "Features/Friendship/FriendAvatar",
  component: FriendAvatar,
  tags: ["autodocs"],
  args: { name: "코드왕" },
} satisfies Meta<typeof FriendAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OtherTone: Story = { args: { name: "재즈냥" } };

export const Latin: Story = { args: { name: "pianoman" } };

/** Used for people who haven't answered a request yet. */
export const Muted: Story = { args: { muted: true } };

/** Each name keeps its own colour. */
export const Palette: Story = {
  render: (args) => (
    <div className="flex gap-2">
      {["코드왕", "재즈냥", "블루스박", "도레미", "화음요정", "건반마스터", "피아노숲"].map((name) => (
        <FriendAvatar key={name} {...args} name={name} />
      ))}
    </div>
  ),
};
