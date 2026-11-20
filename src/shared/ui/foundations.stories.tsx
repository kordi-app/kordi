import type { Meta, StoryObj } from "@storybook/nextjs-vite";

/**
 * Colour tokens, in two layers (after SEED): raw palette steps, and the
 * semantic tokens components use, which point at those steps. Source of
 * truth: src/app/globals.css.
 */
const meta = {
  title: "Foundations/Tokens",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const GRAY_STEPS = ["00", "100", "200", "300", "400", "500", "600", "700", "800", "900", "1000"];
const ALPHA_STEPS = ["100", "200", "300", "400", "500"];
const HUES = ["red", "yellow", "green", "blue", "purple"] as const;
const HUE_STEPS = ["100", "200", "300", "500", "700", "800", "900"];

function Swatch({ name, label }: { name: string; label?: string }) {
  return (
    <div className="min-w-0">
      <div className="h-12 rounded-md border border-stroke-neutral-subtle" style={{ background: `var(--${name})` }} />
      <p className="mt-1.5 truncate text-[11px] text-fg-neutral-muted">{label ?? name}</p>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="mb-3 text-[13px] font-semibold text-fg-neutral">{title}</h3>
      {children}
    </section>
  );
}

/** Raw steps. Components never use these directly — only the semantic layer does. */
export const Palette: Story = {
  render: () => (
    <div>
      <Row title="gray">
        <div className="grid grid-cols-11 gap-2">
          {GRAY_STEPS.map((step) => (
            <Swatch key={step} name={`palette-gray-${step}`} label={step} />
          ))}
        </div>
      </Row>
      <Row title="gray-alpha (ink at opacity)">
        <div className="grid grid-cols-11 gap-2">
          {ALPHA_STEPS.map((step) => (
            <Swatch key={step} name={`palette-gray-alpha-${step}`} label={step} />
          ))}
        </div>
      </Row>
      {HUES.map((hue) => (
        <Row key={hue} title={hue}>
          <div className="grid grid-cols-11 gap-2">
            {HUE_STEPS.map((step) => (
              <Swatch key={step} name={`palette-${hue}-${step}`} label={step} />
            ))}
          </div>
        </Row>
      ))}
    </div>
  ),
};

const SEMANTIC: Record<string, string[]> = {
  "bg — surfaces": [
    "bg-layer-basement",
    "bg-layer-default",
    "bg-layer-floating",
    "bg-neutral-solid",
    "bg-neutral-solid-pressed",
    "bg-neutral-weak",
    "bg-neutral-weak-pressed",
    "bg-disabled",
    "bg-critical-solid",
    "bg-critical-weak",
    "bg-positive-solid",
    "bg-positive-weak",
    "bg-warning-solid",
    "bg-warning-weak",
    "bg-informative-weak",
    "bg-overlay",
  ],
  "fg — text & icons": [
    "fg-neutral",
    "fg-neutral-muted",
    "fg-neutral-subtle",
    "fg-placeholder",
    "fg-disabled",
    "fg-critical",
    "fg-positive",
    "fg-warning",
    "fg-informative",
  ],
  "stroke — lines": [
    "stroke-neutral-subtle",
    "stroke-neutral-weak",
    "stroke-neutral-weak-hover",
    "stroke-neutral-solid",
    "stroke-critical-solid",
    "stroke-focus-ring",
  ],
};

/** What each colour is for. Use as bg-bg-*, text-fg-*, border-stroke-* (or the shadcn aliases). */
export const Semantic: Story = {
  render: () => (
    <div>
      {Object.entries(SEMANTIC).map(([group, names]) => (
        <Row key={group} title={group}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {names.map((name) =>
              name.startsWith("fg-") ? (
                <div key={name} className="min-w-0 rounded-md border border-stroke-neutral-subtle bg-bg-layer-default px-3 py-2.5">
                  <p className="text-[15px] font-semibold" style={{ color: `var(--${name})` }}>
                    가나다 Aa
                  </p>
                  <p className="mt-1 truncate text-[11px] text-fg-neutral-muted">{name}</p>
                </div>
              ) : name.startsWith("stroke-") ? (
                <div key={name} className="min-w-0">
                  <div className="h-12 rounded-md border-2 bg-bg-layer-default" style={{ borderColor: `var(--${name})` }} />
                  <p className="mt-1.5 truncate text-[11px] text-fg-neutral-muted">{name}</p>
                </div>
              ) : (
                <Swatch key={name} name={name} />
              ),
            )}
          </div>
        </Row>
      ))}
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="space-y-3 text-fg-neutral">
      <p className="text-[32px] font-semibold -tracking-[0.025em]">코드를 듣고 맞혀 보세요 32</p>
      <p className="text-2xl font-bold">친구 24</p>
      <p className="text-lg font-semibold">받은 요청 18</p>
      <p className="text-[15px] font-medium">재즈냥 15 medium</p>
      <p className="text-sm">본문 14 — 건반을 눌러보세요. 코드 이름이 여기에 나와요.</p>
      <p className="text-[13px] text-fg-neutral-muted">보조 13 — 수락을 기다리는 중</p>
      <p className="text-xs text-fg-neutral-subtle">캡션 12</p>
    </div>
  ),
};
