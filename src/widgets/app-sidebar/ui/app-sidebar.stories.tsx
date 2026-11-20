import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

const meta = {
  title: "Widgets/AppSidebar",
  component: AppSidebar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/ko/chord-practice" } },
  },
  decorators: [
    (Story, { parameters }) => (
      <SidebarProvider defaultOpen={parameters.sidebarOpen ?? true}>
        {Story()}
        <SidebarInset className="p-4">
          <SidebarTrigger />
        </SidebarInset>
      </SidebarProvider>
    ),
  ],
} satisfies Meta<typeof AppSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** "코드 연습" is active (pathname /ko/chord-practice). */
export const Expanded: Story = {};

/** Icon-only rail; labels move into tooltips. */
export const Collapsed: Story = {
  parameters: { sidebarOpen: false },
};

export const ProfileActive: Story = {
  parameters: { nextjs: { navigation: { pathname: "/ko/me" } } },
};
