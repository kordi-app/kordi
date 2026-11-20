import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "./avatar";

const meta = {
  title: "Shared/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: { size: "default" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "default", "lg"] } },
  render: (args) => (
    <Avatar {...args}>
      <AvatarFallback>코</AvatarFallback>
    </Avatar>
  ),
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fallback: Story = {};
export const Large: Story = { args: { size: "lg" } };
export const WithImage: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarImage src="/kordi/kordi-idle.png" alt="Kordi" />
      <AvatarFallback>K</AvatarFallback>
    </Avatar>
  ),
};
export const Group: Story = {
  render: () => (
    <AvatarGroup>
      {["코", "재", "음"].map((c) => (
        <Avatar key={c}>
          <AvatarFallback>{c}</AvatarFallback>
        </Avatar>
      ))}
      <AvatarGroupCount>+4</AvatarGroupCount>
    </AvatarGroup>
  ),
};
