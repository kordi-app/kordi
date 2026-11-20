import type { Meta, StoryObj } from "@storybook/nextjs-vite";

/** The cream system's colour tokens and type scale (from app/globals.css). */
const meta = {
  title: "Foundations/Tokens",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const COLORS = [
  "background", "foreground", "card", "primary", "primary-foreground", "secondary",
  "muted", "muted-foreground", "accent", "border", "destructive", "ring",
];

export const Colors: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {COLORS.map((name) => (
        <div key={name} className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="h-14" style={{ background: `var(--${name})` }} />
          <p className="px-3 py-2 text-xs text-muted-foreground">--{name}</p>
        </div>
      ))}
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="space-y-3 text-foreground">
      <p className="text-[32px] font-semibold -tracking-[0.025em]">코드를 듣고 맞혀 보세요 32</p>
      <p className="text-2xl font-bold">친구 24</p>
      <p className="text-lg font-semibold">내 네트워크 18</p>
      <p className="text-[15px] font-medium">재즈냥 15 medium</p>
      <p className="text-sm">본문 14 — 건반을 눌러보세요. 코드 이름이 여기에 나와요.</p>
      <p className="text-[13px] text-muted-foreground">보조 13 — 수락을 기다리는 중</p>
      <p className="text-xs text-muted-foreground">캡션 12</p>
    </div>
  ),
};
