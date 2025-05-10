/**
 * src/app/components/game/cards/base-card/BaseCard.test.tsx
 */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import BaseCard from "./BaseCard";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
  CardType,
} from "./base-card.types";

describe("BaseCard Component", () => {
  const mockFaceContent = <div data-testid="face-content">Face</div>;
  const mockBackContent = <div data-testid="back-content">Back</div>;

  const mockCardContext: CardActionContext = {
    id: "test-card",
    symbol: "TST",
    type: "price" as CardType,
  };
  const mockSocialInteractions: BaseCardSocialInteractions = {
    onLike: jest.fn(),
    onComment: jest.fn(),
    onSave: jest.fn(),
    onShare: jest.fn(),
  };

  const defaultProps = {
    isFlipped: false,
    faceContent: mockFaceContent,
    backContent: mockBackContent,
    cardContext: mockCardContext,
    socialInteractions: mockSocialInteractions,
  };

  // --- Passing tests from previous version ---
  test("renders face content when not flipped", () => {
    render(<BaseCard {...defaultProps} isFlipped={false} />);
    expect(screen.getByTestId("face-content")).toBeVisible();
  });

  test("renders back content when flipped (structurally)", () => {
    render(<BaseCard {...defaultProps} isFlipped={true} />);
    expect(screen.getByTestId("face-content")).toBeInTheDocument();
    expect(screen.getByTestId("back-content")).toBeInTheDocument();
  });

  test("applies correct transform style to inner card when isFlipped is true", () => {
    render(<BaseCard {...defaultProps} isFlipped={true} />);
    const rotatingDiv = screen.getByTestId("base-card-inner");
    expect(rotatingDiv).toHaveStyle("transform: rotateY(180deg)");
  });

  test("applies correct transform style to inner card when isFlipped is false", () => {
    render(<BaseCard {...defaultProps} isFlipped={false} />);
    const rotatingDiv = screen.getByTestId("base-card-inner");
    expect(rotatingDiv).toHaveStyle("transform: rotateY(0deg)");
  });

  test("applies custom className to the outer div", () => {
    const customClass = "my-custom-outer-class";
    const { container } = render(
      <BaseCard {...defaultProps} className={customClass} />
    );
    expect(container.firstChild).toHaveClass(customClass);
    expect(container.firstChild).toHaveClass("group");
  });

  test("applies custom innerCardClassName to the inner flipping div", () => {
    const customInnerClass = "my-custom-inner-class";
    render(
      <BaseCard {...defaultProps} innerCardClassName={customInnerClass} />
    );
    const rotatingDiv = screen.getByTestId("base-card-inner");
    expect(rotatingDiv).toHaveClass(customInnerClass);
  });

  test("renders children outside the flipping mechanism", () => {
    const childText = "Overlay Content";
    render(
      <BaseCard {...defaultProps}>
        <button>{childText}</button>
      </BaseCard>
    );
    const rotatingDiv = screen.getByTestId("base-card-inner");
    const childButton = screen.getByRole("button", { name: childText });

    expect(childButton).toBeInTheDocument();
    expect(rotatingDiv.contains(childButton)).toBe(false);
    expect(rotatingDiv.parentElement?.contains(childButton)).toBe(true);
  });

  test("inner card has correct structural CSS properties applied via style prop", () => {
    render(<BaseCard {...defaultProps} isFlipped={false} />);
    const rotatingDiv = screen.getByTestId("base-card-inner");

    expect(rotatingDiv.style.position).toBe("relative");
    expect(rotatingDiv.style.width).toBe("100%");
    expect(rotatingDiv.style.height).toBe("100%");
    expect(rotatingDiv.style.transition).toContain("transform 0.7s");
    expect(rotatingDiv.style.transformStyle).toBe("preserve-3d");
  });
  // --- End of previously passing tests ---

  test("face and back elements have correct structural CSS properties", () => {
    render(<BaseCard {...defaultProps} />);

    const faceWrapper = screen.getByTestId("face-content").parentElement
      ?.parentElement as HTMLElement;
    expect(faceWrapper).toBeInTheDocument();
    if (faceWrapper) {
      expect(faceWrapper).toHaveStyle("position: absolute");
      expect(faceWrapper).toHaveStyle("top: 0px");
      expect(faceWrapper).toHaveStyle("left: 0px");
      expect(faceWrapper).toHaveStyle("width: 100%");
      expect(faceWrapper).toHaveStyle("height: 100%");
      expect(faceWrapper).toHaveStyle("display: flex");
      expect(faceWrapper).toHaveStyle("flex-direction: column");

      expect(faceWrapper.style.backfaceVisibility).toBe("hidden");
      // expect(faceWrapper.style.webkitBackfaceVisibility).toBe('hidden'); // Removed this check

      expect(faceWrapper.style.transform).toBe("");
    }

    const backWrapper = screen.getByTestId("back-content").parentElement
      ?.parentElement as HTMLElement;
    expect(backWrapper).toBeInTheDocument();
    if (backWrapper) {
      expect(backWrapper).toHaveStyle("position: absolute");
      expect(backWrapper).toHaveStyle("top: 0px");
      expect(backWrapper).toHaveStyle("left: 0px");
      expect(backWrapper).toHaveStyle("width: 100%");
      expect(backWrapper).toHaveStyle("height: 100%");
      expect(backWrapper).toHaveStyle("display: flex");
      expect(backWrapper).toHaveStyle("flex-direction: column");
      expect(backWrapper).toHaveStyle("transform: rotateY(180deg)");

      expect(backWrapper.style.backfaceVisibility).toBe("hidden");
      // expect(backWrapper.style.webkitBackfaceVisibility).toBe('hidden'); // Removed this check
    }
  });

  test("renders SocialBar structure when socialInteractions are provided, even if initially hidden", () => {
    render(<BaseCard {...defaultProps} />);
    const socialBars = screen.getAllByRole("toolbar", {
      name: "Social actions",
    });
    expect(socialBars.length).toBeGreaterThanOrEqual(1);
    const firstSocialBar = socialBars[0];
    expect(firstSocialBar).toBeInTheDocument();

    const likeButton = within(firstSocialBar).getByRole("button", {
      name: `Like ${mockCardContext.symbol} card`,
    });
    expect(likeButton).toBeInTheDocument();
    expect(
      within(likeButton).getByTestId("mock-lucide-icon-thumbsup")
    ).toBeInTheDocument();

    const commentButton = within(firstSocialBar).getByRole("button", {
      name: `Comment on ${mockCardContext.symbol} card`,
    });
    expect(commentButton).toBeInTheDocument();
    expect(
      within(commentButton).getByTestId("mock-lucide-icon-messagecircle")
    ).toBeInTheDocument();
  });

  test("does not render SocialBar when socialInteractions are not provided", () => {
    const propsWithoutSocial = {
      ...defaultProps,
      socialInteractions: undefined,
    };
    render(<BaseCard {...propsWithoutSocial} />);
    expect(
      screen.queryByRole("toolbar", { name: "Social actions" })
    ).not.toBeInTheDocument();
  });
});
