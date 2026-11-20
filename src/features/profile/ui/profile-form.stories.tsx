import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { ProfileForm } from "./profile-form";

/** Clicks "수정", then optionally replaces the nickname (the duplicate check runs after a 500ms debounce). */
const edit = (nickname?: string): NonNullable<Story["play"]> =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button"));
    if (nickname === undefined) return;
    const input = await canvas.findByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, nickname);
  };

const meta = {
  title: "Features/Profile/ProfileForm",
  component: ProfileForm,
  tags: ["autodocs"],
  args: { currentNickname: "코드왕" },
  parameters: {
    queries: [
      // ["user", "check-nickname", x] → true means taken
      [["user", "check-nickname", "재즈냥"], true],
      [["user", "check-nickname", "코드여왕"], false],
    ],
  },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Viewing: Story = {};

export const LongNickname: Story = { args: { currentNickname: "세상에서가장긴닉네임을가진사람" } };

/** Editing, unchanged: save stays disabled. */
export const Editing: Story = { play: edit() };

export const Available: Story = { play: edit("코드여왕") };

export const Duplicated: Story = { play: edit("재즈냥") };

export const TooShort: Story = {
  play: async (context) => {
    await edit("코")(context);
    // save is disabled while invalid: submit from the field instead, which runs validation
    await userEvent.keyboard("{Enter}");
  },
};

export const InvalidCharacters: Story = {
  play: async (context) => {
    await edit("코드왕!!")(context);
    // save is disabled while invalid: submit from the field instead, which runs validation
    await userEvent.keyboard("{Enter}");
  },
};
