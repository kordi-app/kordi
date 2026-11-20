import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { KeyboardMusic, Piano, Trophy } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar";

/** The sidebar primitives. The app's real sidebar is Widgets/AppSidebar. */
const meta = {
  title: "Shared/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>연습</SidebarGroupLabel>
            <SidebarMenu>
              {[
                { icon: Piano, label: "자유 연주", active: true },
                { icon: KeyboardMusic, label: "코드 연습" },
                { icon: Trophy, label: "랭킹" },
              ].map(({ icon: Icon, label, active }) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton isActive={active}>
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="p-4">
          <SidebarTrigger />
        </div>
      </SidebarInset>
    </SidebarProvider>
  ),
};
