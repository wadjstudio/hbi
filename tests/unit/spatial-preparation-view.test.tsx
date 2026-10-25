// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SpatialPreparationView } from "@/components/workspace/spatial-preparation";
import { preparationFixture } from "@/tests/fixtures/spatial-preparation";
import { crossingFixture } from "@/tests/fixtures/tactical-results";
vi.mock("@/components/workspace/provider", () => ({ useWorkspace: () => ({ t: (_ar: string, en: string) => en }) }));
afterEach(cleanup);
it("maps actual metres onto the existing physical court and hides points outside the video interval", () => {
  const { rerender } = render(<SpatialPreparationView preparation={preparationFixture()} report={crossingFixture()} timeMs={1000} />);
  const circle = document.querySelector('circle')!;
  expect(circle.getAttribute("cx")).toBe("500"); expect(circle.getAttribute("cy")).toBe("250");
  expect(screen.getByText(/Group A: 1/)).toBeTruthy();
  expect(screen.getByText(/not team or player identities/)).toBeTruthy();
  rerender(<SpatialPreparationView preparation={preparationFixture()} report={crossingFixture()} timeMs={5000} />);
  expect(screen.getByText("Outside preparation sample")).toBeTruthy(); expect(document.querySelector('circle')).toBeNull();
});
it("shows unavailable positions without rendering a guessed court map", () => {
  render(<SpatialPreparationView preparation={preparationFixture(false)} report={crossingFixture()} timeMs={1000} />);
  expect(screen.getByText(/Court calibration is unavailable/)).toBeTruthy(); expect(document.querySelector('circle')).toBeNull();
});
