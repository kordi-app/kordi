import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./sheet";

const meta = {
  title: "Shared/Sheet",
  component: SheetContent,
  tags: ["autodocs"],
  args: { side: "right" },
  argTypes: { side: { control: "inline-radio", options: ["top", "right", "bottom", "left"] } },
  render: (args) => (
    <Sheet defaultOpen>
      <SheetTrigger render={<Button variant="outline" />}>설정 열기</SheetTrigger>
      <SheetContent {...args}>
        <SheetHeader>
          <SheetTitle>연습 설정</SheetTitle>
          <SheetDescription>난이도와 코드 종류를 고르세요.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
} satisfies Meta<typeof SheetContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Right: Story = {};
export const Bottom: Story = { args: { side: "bottom" } };
