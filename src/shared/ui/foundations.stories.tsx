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
      <p className="mt-1.5 truncate text-t1 text-fg-neutral-muted">{label ?? name}</p>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="mb-3 text-t3 font-semibold text-fg-neutral">{title}</h3>
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
                  <p className="text-t5 font-semibold" style={{ color: `var(--${name})` }}>
                    가나다 Aa
                  </p>
                  <p className="mt-1 truncate text-t1 text-fg-neutral-muted">{name}</p>
                </div>
              ) : name.startsWith("stroke-") ? (
                <div key={name} className="min-w-0">
                  <div className="h-12 rounded-md border-2 bg-bg-layer-default" style={{ borderColor: `var(--${name})` }} />
                  <p className="mt-1.5 truncate text-t1 text-fg-neutral-muted">{name}</p>
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

// full class names, so Tailwind generates them
const TYPE_STEPS = [
  ["t1", "11", "text-t1"],
  ["t2", "12", "text-t2"],
  ["t3", "13", "text-t3"],
  ["t4", "14", "text-t4"],
  ["t5", "16", "text-t5"],
  ["t6", "18", "text-t6"],
  ["t7", "20", "text-t7"],
  ["t8", "22", "text-t8"],
  ["t9", "24", "text-t9"],
  ["t10", "26", "text-t10"],
  ["t11", "28", "text-t11"],
  ["t12", "32", "text-t12"],
  ["t13", "40", "text-t13"],
] as const;

/** Font-size steps (each with its own line height). Use as text-t1 … text-t13. */
export const Typography: Story = {
  render: () => (
    <div className="space-y-2 text-fg-neutral">
      {TYPE_STEPS.map(([step, px, cls]) => (
        <div key={step} className="flex items-baseline gap-4">
          <span className="w-16 shrink-0 text-t2 text-fg-neutral-subtle">
            {step} · {px}
          </span>
          <span className={`${cls} font-medium`}>코드를 듣고 맞혀 보세요 Aa</span>
        </div>
      ))}
      <p className="pt-3 text-t3 text-fg-neutral-muted">
        Weights: regular 400 · medium 500 · semibold 600 (the system caps at 600).
      </p>
    </div>
  ),
};

const RADII = [
  ["r1", "4px", "rounded-r1"], ["r2", "8px", "rounded-r2"], ["r3", "12px", "rounded-r3"], ["r4", "16px", "rounded-r4"],
  ["r5", "20px", "rounded-r5"], ["r6", "24px", "rounded-r6"], ["full", "9999px", "rounded-full"],
] as const;
const RADIUS_ROLES = [
  ["control", "버튼 · 입력창", "rounded-control"], ["card", "카드 · 목록 묶음", "rounded-card"], ["container", "다이얼로그 · 시트", "rounded-container"],
] as const;

/** Corner steps, and the roles components use (rounded-control / rounded-card / rounded-container). */
export const Radius: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4">
        {RADII.map(([step, px, cls]) => (
          <div key={step} className="text-center">
            <div className={`size-16 border border-stroke-neutral-weak bg-bg-neutral-weak ${cls}`} />
            <p className="mt-1.5 text-t1 text-fg-neutral-muted">
              {step} · {px}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {RADIUS_ROLES.map(([role, use, cls]) => (
          <div key={role}>
            <div className={`h-16 w-32 border border-stroke-neutral-weak bg-bg-layer-default ${cls}`} />
            <p className="mt-1.5 text-t2 text-fg-neutral">rounded-{role}</p>
            <p className="text-t1 text-fg-neutral-muted">{use}</p>
          </div>
        ))}
      </div>
    </div>
  ),
};

const SPACING_STEPS = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16];
const SPACING_ROLES = [
  ["between-text", "6px", "제목 → 설명", "w-between-text"],
  ["between-chips", "8px", "칩 · 알약 · 작은 버튼 사이", "w-between-chips"],
  ["component", "12px", "컴포넌트 안쪽 기본 여백", "w-component"],
  ["page-x", "24px", "페이지 좌우 (모바일)", "w-page-x"],
  ["page-x-wide", "32px", "페이지 좌우 (md 이상)", "w-page-x-wide"],
  ["section", "40px", "페이지 섹션 사이", "w-section"],
] as const;

/** The 4px step grid (p-1 = 4px …), and the named spaces on top (px-page-x, gap-section, gap-between-chips …). */
export const Spacing: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="space-y-1.5">
        {SPACING_STEPS.map((step) => (
          <div key={step} className="flex items-center gap-3">
            <span className="w-20 text-t2 text-fg-neutral-subtle">
              {step} · {step * 4}px
            </span>
            <div className="h-3 rounded-r1 bg-palette-gray-700" style={{ width: step * 4 }} />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {SPACING_ROLES.map(([role, px, use, cls]) => (
          <div key={role} className="flex items-center gap-3">
            <span className="w-28 text-t2 text-fg-neutral">{role}</span>
            <div className={`h-3 rounded-r1 bg-palette-blue-500 ${cls}`} />
            <span className="text-t2 text-fg-neutral-muted">
              {px} · {use}
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
};
