import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "Shared/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "저장하기", onClick: fn() },
  argTypes: {
    variant: { control: "select", options: ["default", "secondary", "outline", "ghost", "destructive", "link"] },
    size: { control: "select", options: ["xs", "sm", "default", "lg", "icon-xs", "icon-sm", "icon", "icon-lg"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary", children: "나중에" } };
export const Outline: Story = { args: { variant: "outline", children: "다시 하기" } };
export const Ghost: Story = { args: { variant: "ghost", children: "거절" } };
export const Destructive: Story = { args: { variant: "destructive", children: "정말 삭제할까요?" } };
export const Link: Story = { args: { variant: "link", children: "자세히 보기" } };
export const Disabled: Story = { args: { disabled: true } };
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plus />
        친구 추가
      </>
    ),
  },
};
export const IconOnly: Story = { args: { size: "icon", variant: "outline", "aria-label": "삭제", children: <Trash2 /> } };

/** Every variant at every size, for checking the system at a glance. */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["xs", "sm", "default", "lg"] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-3">
          <span className="w-14 text-xs text-muted-foreground">{size}</span>
          {(["default", "secondary", "outline", "ghost", "destructive", "link"] as const).map((variant) => (
            <Button key={variant} size={size} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};
