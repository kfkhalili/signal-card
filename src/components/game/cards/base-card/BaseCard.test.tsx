/**
 * src/app/components/game/cards/base-card/BaseCard.test.tsx
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BaseCard from "./BaseCard";

// Minimal mock for ShadCard if needed, or let it render if it's simple
// jest.mock('@/components/ui/card', () => ({
//   Card: ({
//     children,
//     className,
//   }: {
//     children: React.ReactNode;
//     className?: string;
//   }) => <div className={className}>{children}</div>,
// }));

// Minimal mock for cn utility
jest.mock("@/lib/utils", () => ({
  cn: (...args: Array<string | undefined | null | boolean>) =>
    args.filter(Boolean).join(" "),
}));

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
    expect(screen.getByTestId("face-content")).toBeVisible();
    // Back content is in the DOM but hidden by CSS (backface-hidden)
    expect(screen.getByTestId("back-content")).toBeInTheDocument();
  });

  test("renders back content when flipped (visually)", () => {
    render(
      <BaseCard
        isFlipped={true}
        faceContent={mockFaceContent}
        backContent={mockBackContent}
      />
    );
    expect(screen.getByTestId("back-content")).toBeVisible();
    // Face content is in the DOM but hidden by CSS (backface-hidden)
    expect(screen.getByTestId("face-content")).toBeInTheDocument();
  });

  test('applies "rotate-y-180" class to inner card when isFlipped is true', () => {
    const { container } = render(
      <BaseCard
        isFlipped={true}
        faceContent={mockFaceContent}
        backContent={mockBackContent}
      />
    );
    const innerCard = container.querySelector(".preserve-3d");
    expect(innerCard).toHaveClass("rotate-y-180");
  });

  test('does not apply "rotate-y-180" class to inner card when isFlipped is false', () => {
    const { container } = render(
      <BaseCard
        isFlipped={false}
        faceContent={mockFaceContent}
        backContent={mockBackContent}
      />
    );
    const innerCard = container.querySelector(".preserve-3d");
    expect(innerCard).not.toHaveClass("rotate-y-180");
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
    render(
      <BaseCard
        isFlipped={false}
        faceContent={mockFaceContent}
        backContent={mockBackContent}
        innerCardClassName={customInnerClass}
      />
    );
    // The div with 'preserve-3d' is the one that gets innerCardClassName
    const innerCard =
      screen.getByTestId("face-content").parentElement?.parentElement;
    expect(innerCard).toHaveClass(customInnerClass);
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
    // Ensure children are not part of the flipping card faces
    expect(
      screen
        .getByTestId("face-content")
        .parentElement?.contains(
          screen.getByRole("button", { name: childText })
        )
    ).toBe(false);
    expect(
      screen
        .getByTestId("back-content")
        .parentElement?.contains(
          screen.getByRole("button", { name: childText })
        )
    ).toBe(false);
  });
});
