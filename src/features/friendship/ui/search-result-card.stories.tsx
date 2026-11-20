import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SearchResultCard } from "./search-result-card";

const meta = {
  title: "Features/Friendship/SearchResultCard",
  component: SearchResultCard,
  tags: ["autodocs"],
  args: {
    user: { id: 7, nickname: "재즈냥", profileImageUrl: null },
    onSend: fn(),
  },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof SearchResultCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** While the request is being sent. */
export const Disabled: Story = { args: { disabled: true } };

export const LongName: Story = {
  args: { user: { id: 8, nickname: "세상에서가장긴닉네임을가진재즈피아니스트", profileImageUrl: null } },
};
