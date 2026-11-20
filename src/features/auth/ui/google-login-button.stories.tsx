import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GoogleLoginButton } from "./google-login-button";

const meta = {
  title: "Features/Auth/GoogleLoginButton",
  component: GoogleLoginButton,
  tags: ["autodocs"],
  args: { label: "Google로 계속하기" },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof GoogleLoginButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Clicking navigates to the real OAuth URL. */
export const Default: Story = {};

export const English: Story = { args: { label: "Continue with Google" } };
