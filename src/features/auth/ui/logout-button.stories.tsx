import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LogoutButton } from "./logout-button";

const meta = {
  title: "Features/Auth/LogoutButton",
  component: LogoutButton,
  tags: ["autodocs"],
  args: { label: "로그아웃" },
} satisfies Meta<typeof LogoutButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Submits a POST form to /api/auth/logout, which doesn't exist in Storybook. */
export const Default: Story = {};

export const FullWidth: Story = { args: { className: "w-64" } };
