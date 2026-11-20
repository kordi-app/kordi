import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { Button } from "./button";
import { Toaster } from "./sonner";

/** The app's toaster (the preview already mounts one; these buttons fire into it). */
const meta = {
  title: "Shared/Toast",
  component: Toaster,
  tags: ["autodocs"],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Kinds: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast.success("친구 요청을 보냈어요")}>success</Button>
      <Button variant="outline" onClick={() => toast.error("저장하지 못했어요")}>error</Button>
      <Button variant="outline" onClick={() => toast("캐릭터를 저장했어요")}>default</Button>
    </div>
  ),
};
