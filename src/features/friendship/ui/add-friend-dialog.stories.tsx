import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import type { PublicUser } from "@/entities/user";
import { AddFriendDialog } from "./add-friend-dialog";

const jazzCat: PublicUser = { id: 7, nickname: "재즈냥", profileImageUrl: null };
const me: PublicUser = { id: 1, nickname: "코드왕", profileImageUrl: null };

/** Opens the dialog and types a nickname (results arrive after the 500ms debounce). */
const search = (nickname?: string): Story["play"] =>
  async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    if (!nickname) return;
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(await body.findByRole("textbox"), nickname);
  };

const meta = {
  title: "Features/Friendship/AddFriendDialog",
  component: AddFriendDialog,
  tags: ["autodocs"],
  args: { currentUserId: me.id },
  parameters: {
    queries: [
      [["user", "search", jazzCat.nickname], jazzCat],
      [["user", "search", me.nickname], me],
    ],
  },
} satisfies Meta<typeof AddFriendDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Just the trigger button. */
export const Closed: Story = {};

/** Open, nothing typed yet: the "2자 이상" hint. */
export const Open: Story = { play: search() };

export const Found: Story = { play: search(jazzCat.nickname) };

/** Searching for your own nickname. */
export const Self: Story = { play: search(me.nickname) };

/** No seeded result: the search request fails and shows "no result". */
export const NotFound: Story = { play: search("없는사람") };
