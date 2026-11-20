import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Canvas } from "@react-three/fiber";
import { CrownMesh } from "./crown-mesh";

const meta = {
  title: "Entities/Character/CrownMesh",
  component: CrownMesh,
  tags: ["autodocs"],
  args: { kind: "gold" },
  argTypes: { kind: { control: "inline-radio", options: ["gold", "star"] } },
  render: (args) => (
    <div className="aspect-square w-full max-w-[280px] rounded-2xl border border-border bg-slate-900">
      <Canvas camera={{ position: [0, 0.55, 1], fov: 40 }} onCreated={({ camera }) => camera.lookAt(0, 0.08, 0)}>
        <hemisphereLight args={["#ffffff", "#444466", 1.4]} />
        <directionalLight position={[1.5, 3, 2]} intensity={2.2} />
        <CrownMesh {...args} />
      </Canvas>
    </div>
  ),
} satisfies Meta<typeof CrownMesh>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The cloud course's reward. */
export const Gold: Story = {};

/** The night course's reward. */
export const Star: Story = { args: { kind: "star" } };
