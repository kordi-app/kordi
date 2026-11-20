import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SectionHeader } from "./section-header";

const meta = {
  title: "Shared/SectionHeader",
  component: SectionHeader,
  tags: ["autodocs"],
  args: { children: "내 프로필", size: "md" },
  argTypes: { size: { control: "inline-radio", options: ["xs", "sm", "md", "lg", "xl"] } },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {};
export const Scale: Story = {
  render: () => (
    <div className="space-y-3">
      {(["xl", "lg", "md", "sm", "xs"] as const).map((size) => (
        <SectionHeader key={size} size={size}>
          {size} — 코드 퀴즈
        </SectionHeader>
      ))}
    </div>
  ),
};
