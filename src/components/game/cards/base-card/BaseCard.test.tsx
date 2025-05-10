import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BaseCard from "./BaseCard";

// Minimal mock for cn utility
jest.mock("@/lib/utils", () => ({
  cn: (...args: Array<string | undefined | null | boolean>) =>
    args.filter(Boolean).join(" "),
}));

// Optional: Minimal mock for ShadCard if it simplifies tests or if it's complex
// jest.mock('@/components/ui/card', () => ({
//   Card: ({ children, className }: { children: React.ReactNode; className?: string; }) => (
//     <div className={className}>{children}</div>
//   ),
// }));

describe("BaseCard Component", () => {
  const mockFaceContent = <div data-testid="face-content">Face Side</div>;
  const mockBackContent = <div data-testid="back-content">Back Side</div>;

  test("renders face content when not flipped", () => {
    render(
      <BaseCard
        isFlipped={false}
        faceContent={mockFaceContent}
        backContent={mockBackContent}
      />
    );
    expect(screen.getByTestId("face-content")).toBeInTheDocument();
    // Depending on CSS, visibility might be complex. Testing presence is key.
    // To test actual visibility: ensure your CSS makes one side truly not visible or use a more sophisticated check.
    // For simplicity, we check it's in the DOM. The CSS handles the visual "flip".
  });

  test("renders back content when flipped", () => {
    render(
      <BaseCard
        isFlipped={true}
        faceContent={mockFaceContent}
        backContent={mockBackContent}
      />
    );
    expect(screen.getByTestId("back-content")).toBeInTheDocument();
  });

  test('applies "rotate-y-180" class to inner card when isFlipped is true', () => {
    const { container } = render(
      <BaseCard
        isFlipped={true}
        faceContent={mockFaceContent}
        backContent={mockBackContent}
      />
    );
    // Find the div that actually rotates
    const rotatingDiv = container.querySelector(".preserve-3d");
    expect(rotatingDiv).toHaveClass("rotate-y-180");
  });

  test('does not apply "rotate-y-180" class to inner card when isFlipped is false', () => {
    const { container } = render(
      <BaseCard
        isFlipped={false}
        faceContent={mockFaceContent}
        backContent={mockBackContent}
      />
    );
    const rotatingDiv = container.querySelector(".preserve-3d");
    expect(rotatingDiv).not.toHaveClass("rotate-y-180");
  });

  test("applies custom className to the outer div", () => {
    const customClass = "my-custom-outer-class";
    const { container } = render(
      <BaseCard
        isFlipped={false}
        faceContent={mockFaceContent}
        backContent={mockBackContent}
        className={customClass}
      />
    );
    expect(container.firstChild).toHaveClass(customClass);
  });

  test("applies custom innerCardClassName to the inner flipping div", () => {
    const customInnerClass = "my-custom-inner-class";
    const { container } = render(
      <BaseCard
        isFlipped={false}
        faceContent={mockFaceContent}
        backContent={mockBackContent}
        innerCardClassName={customInnerClass}
      />
    );
    const rotatingDiv = container.querySelector(".preserve-3d");
    expect(rotatingDiv).toHaveClass(customInnerClass);
  });

  test("renders children outside the flipping mechanism", () => {
    const childText = "Overlay Button";
    render(
      <BaseCard
        isFlipped={false}
        faceContent={mockFaceContent}
        backContent={mockBackContent}
      >
        <button type="button">{childText}</button>
      </BaseCard>
    );
    expect(screen.getByRole("button", { name: childText })).toBeInTheDocument();
    // Ensure children are not part of the rotating card faces themselves
    const rotatingDiv = screen
      .getByRole("button", { name: childText })
      .parentElement?.querySelector(".preserve-3d");
    expect(
      rotatingDiv?.contains(screen.getByRole("button", { name: childText }))
    ).toBe(false);
  });
});
