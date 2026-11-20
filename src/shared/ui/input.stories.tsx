import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./input";

const meta = {
  title: "Shared/Input",
  component: Input,
  tags: ["autodocs"],
  args: { placeholder: "닉네임을 입력하세요" },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: "재즈냥" } };
export const Invalid: Story = { args: { defaultValue: "a", "aria-invalid": true } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "수정할 수 없어요" } };
