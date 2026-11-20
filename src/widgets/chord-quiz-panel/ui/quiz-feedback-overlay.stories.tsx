import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QuizFeedbackOverlay } from "./quiz-feedback-overlay";

const meta = {
  title: "Widgets/ChordQuizPanel/QuizFeedbackOverlay",
  component: QuizFeedbackOverlay,
  tags: ["autodocs"],
  args: { feedback: "correct" },
  argTypes: {
    feedback: { control: "inline-radio", options: [null, "correct", "incorrect", "timeout"] },
  },
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="h-96">{Story()}</div>],
} satisfies Meta<typeof QuizFeedbackOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Correct: Story = {};

export const Incorrect: Story = { args: { feedback: "incorrect" } };

export const Timeout: Story = { args: { feedback: "timeout" } };

/** Renders nothing between answers. */
export const Hidden: Story = { args: { feedback: null } };
