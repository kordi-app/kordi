import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Canvas } from "@react-three/fiber";
import { DEFAULT_APPEARANCE } from "../model/catalog";
import { KordiModel, type KordiMotion } from "./kordi-model";

const STILL: KordiMotion = { phase: 0, amount: 0, emote: null, land: 0, stretch: 0, lean: 0, bank: 0 };

const meta = {
  title: "Entities/Character/KordiModel",
  component: KordiModel,
  tags: ["autodocs"],
  args: { motion: { current: STILL }, appearance: DEFAULT_APPEARANCE },
  argTypes: { motion: { control: false } },
  render: (args) => (
    <div className="aspect-square w-full max-w-[360px] rounded-2xl border border-border bg-muted/40">
      <Canvas camera={{ position: [0, 1.05, 3.1], fov: 32 }} onCreated={({ camera }) => camera.lookAt(0, 0.72, 0)}>
        <hemisphereLight args={["#ffffff", "#e8dfd0", 1.6]} />
        <directionalLight position={[2.5, 4, 3]} intensity={2} />
        <KordiModel {...args} />
      </Canvas>
    </div>
  ),
} satisfies Meta<typeof KordiModel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HeadphonesScarf: Story = {
  args: { appearance: { body: "sky", hat: "headphones", face: "smile", accessory: "scarf", pet: null } },
};

export const BeretGlasses: Story = {
  args: { appearance: { body: "cocoa", hat: "beret", face: "default", accessory: "glasses", pet: null } },
};

export const FlowerSleepy: Story = {
  args: { appearance: { body: "pink", hat: "flower", face: "sleepy", accessory: null, pet: null } },
};

export const RibbonBowtie: Story = {
  args: { appearance: { body: "lilac", hat: "ribbon", face: "sparkle", accessory: "bowtie", pet: null } },
};

export const GoldCrown: Story = {
  args: { appearance: { body: "lemon", hat: "crown", face: "sparkle", accessory: null, pet: null } },
};

export const StarCrown: Story = {
  args: { appearance: { body: "mint", hat: "star-crown", face: "smile", accessory: "scarf", pet: null } },
};

/** The baby moon-whale, from the cat's dream sea, swimming by the shoulder. */
export const MoonWhalePet: Story = {
  args: { appearance: { body: "sky", hat: null, face: "smile", accessory: null, pet: "moon-whale" }, glow: 1 },
};

/** Walking pose is driven by `motion`; this one is frozen mid-wave. */
export const Waving: Story = {
  args: { motion: { current: { ...STILL, emote: "wave" } } },
};
