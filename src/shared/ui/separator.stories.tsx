import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Separator } from "./separator";

const meta = {
  title: "Shared/Separator",
  component: Separator,
  tags: ["autodocs"],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (args) => (
    <div className="max-w-sm text-sm">
      <p>받은 요청</p>
      <Separator {...args} className="my-3" />
      <p>친구</p>
    </div>
  ),
};
export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center gap-3 text-sm">
      <span>옥타브 3</span>
      <Separator orientation="vertical" />
      <span>세기 80</span>
    </div>
  ),
};
