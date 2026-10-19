// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { IdentityImage } from "@/components/brand/identity-image";
import { TeamCrest } from "@/components/brand/team-crest";
import { PlayerAvatar } from "@/components/brand/brand-lockup";
import { EntityEditor } from "@/components/workspace/controls";
import { AccountProfile } from "@/components/workspace/account-profile";
import { identityImageSource } from "@/lib/brand/identity-image";
import { accountProfileInput } from "@/features/workspace/profile-input";

const state = vi.hoisted(() => ({
  online: true,
  role: "owner",
  save: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock("@/components/workspace/provider", () => ({
  useWorkspace: () => ({
    ...state,
    user: "coach",
    account: { name: "Coach", initials: "C", email: "coach@example.test" },
    t: (_ar: string, en: string) => en,
  }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.online = true;
  state.role = "owner";
});

it("accepts only HTTPS and application paths and rejects credentials, controls and ambiguous schemes", () => {
  expect(identityImageSource(" https://example.test/player.png ")).toBe(
    "https://example.test/player.png",
  );
  expect(identityImageSource("/brand/team.svg")).toBe("/brand/team.svg");
  for (const value of [
    null,
    {},
    "",
    "http://example.test/a",
    "//example.test/a",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "blob:https://example.test/a",
    "https://user:pass@example.test/a",
    "/\\example.test/a",
    "https://example.test/a\nb",
    "x".repeat(8193),
  ])
    expect(identityImageSource(value)).toBeNull();
});
it("keeps raw image URLs private from the Next proxy and falls back after a failed load", () => {
  render(
    <IdentityImage
      src="https://example.test/player.png"
      alt="Player photo"
      fallback={<span>No photo</span>}
    />,
  );
  const image = screen.getByAltText("Player photo");
  expect(image.getAttribute("src")).toBe("https://example.test/player.png");
  expect(image.getAttribute("referrerpolicy")).toBe("no-referrer");
  fireEvent.error(image);
  expect(screen.queryByAltText("Player photo")).toBeNull();
  expect(screen.getByText("No photo")).toBeTruthy();
});
it("retries a failed source on reconnect and accepts a replacement source", () => {
  const view = render(
    <IdentityImage
      src="https://example.test/a.png"
      alt="Photo"
      fallback={<span>Missing</span>}
    />,
  );
  fireEvent.error(screen.getByAltText("Photo"));
  fireEvent(window, new Event("online"));
  expect(screen.getByAltText("Photo").getAttribute("src")).toBe(
    "https://example.test/a.png",
  );
  fireEvent.error(screen.getByAltText("Photo"));
  view.rerender(
    <IdentityImage
      src="https://example.test/b.png"
      alt="Photo"
      fallback={<span>Missing</span>}
    />,
  );
  expect(screen.getByAltText("Photo").getAttribute("src")).toBe(
    "https://example.test/b.png",
  );
});
it("retains team initials and neutral numbered players when a provided image fails", () => {
  const view = render(
    <>
      <TeamCrest
        name="Test Team"
        shortName="TT"
        logoUrl="https://example.test/team.svg"
      />
      <PlayerAvatar number="17" photoUrl="https://example.test/player.png" />
    </>,
  );
  for (const image of view.container.querySelectorAll("img.identity-photo"))
    fireEvent.error(image);
  expect(screen.getByText("TT")).toBeTruthy();
  expect(screen.getByText("17")).toBeTruthy();
  expect(
    view.container
      .querySelector(".sesen-player-avatar img")
      ?.getAttribute("src"),
  ).toContain("player");
});
it("validates profile names and permits intentional photo removal", () => {
  expect(
    accountProfileInput.safeParse({ name: " Coach ", avatarUrl: "" }).success,
  ).toBe(true);
  for (const value of [
    { name: " ", avatarUrl: "" },
    { name: "x".repeat(81), avatarUrl: "" },
    { name: "Coach", avatarUrl: "http://example.test/a" },
  ])
    expect(accountProfileInput.safeParse(value).success).toBe(false);
});
it("blocks unsafe entity images, serializes a valid URL, and clears it to null", async () => {
  const fields = [
    {
      key: "photo_url",
      ar: "صورة",
      en: "Photo URL",
      type: "image-url" as const,
    },
  ];
  const view = render(<EntityEditor table="players" fields={fields} />);
  const input = screen.getByLabelText("Photo URL");
  fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
  fireEvent.submit(view.container.querySelector("form")!);
  await screen.findByText("Use an HTTPS image URL or app-relative path.");
  expect(state.save).not.toHaveBeenCalled();
  fireEvent.change(input, {
    target: { value: " https://example.test/player.png " },
  });
  fireEvent.submit(view.container.querySelector("form")!);
  await waitFor(() =>
    expect(state.save).toHaveBeenCalledWith("players", {
      photo_url: "https://example.test/player.png",
    }),
  );
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.change(input, { target: { value: "" } });
  fireEvent.submit(view.container.querySelector("form")!);
  await waitFor(() =>
    expect(state.save).toHaveBeenLastCalledWith("players", { photo_url: null }),
  );
});
it("saves only the own-account profile fields and makes no offline update", async () => {
  const view = render(<AccountProfile />);
  fireEvent.change(screen.getByLabelText("Display name"), {
    target: { value: "Analyst" },
  });
  fireEvent.change(screen.getByLabelText("Account photo URL"), {
    target: { value: "https://example.test/coach.png" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  await screen.findByText("Profile saved.");
  expect(state.updateProfile).toHaveBeenCalledWith(
    "Analyst",
    "https://example.test/coach.png",
  );
  state.online = false;
  view.rerender(<AccountProfile />);
  expect(
    (screen.getByRole("button", { name: "Save profile" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
