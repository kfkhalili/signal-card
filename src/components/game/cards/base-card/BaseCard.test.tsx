/**
 * src/app/components/game/cards/base-card/BaseCard.test.tsx
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BaseCard from "./BaseCard";

describe("BaseCard Component", () => {
  const mockFaceContent = <div data-testid="face-content">Face</div>;
  const mockBackContent = <div data-testid="back-content">Back</div>;

  const defaultProps = {
    isFlipped: false,
    faceContent: mockFaceContent,
    backContent: mockBackContent,
  };

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

  // Test that was failing for transformStyle
  test("inner card has correct structural CSS properties applied via style prop", () => {
    render(<BaseCard {...defaultProps} isFlipped={false} />);
    const rotatingDiv = screen.getByTestId("base-card-inner");

    // Check common styles that toHaveStyle handles well with an object
    expect(rotatingDiv).toHaveStyle({
      position: "relative",
      width: "100%",
      height: "100%",
      transition: "transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)",
    });
    // Check transformStyle directly on the style object attribute
    expect(rotatingDiv.style.transformStyle).toBe("preserve-3d");
  });

  // Test that was failing for backfaceVisibility
  test("face and back elements have correct structural CSS properties", () => {
    render(<BaseCard {...defaultProps} />);

    const faceWrapper = screen.getByTestId("face-content")
      .parentElement as HTMLElement;
    expect(faceWrapper).toBeInTheDocument();
    // Check common styles with toHaveStyle object
    expect(faceWrapper).toHaveStyle({
      position: "absolute",
      top: "0px",
      left: "0px",
      width: "100%",
      height: "100%",
    });
    // Check backfaceVisibility directly on the style object attribute
    expect(faceWrapper.style.backfaceVisibility).toBe("hidden");
    // JSDOM might not always populate vendor-prefixed versions like 'WebkitBackfaceVisibility'
    // into element.style in a predictable way, so checking the standard one is often sufficient for tests.
    // If WebkitBackfaceVisibility must be verified, check if `faceWrapper.style.webkitBackfaceVisibility` has a value.
    expect(faceWrapper).not.toHaveStyle("transform: rotateY(180deg)");

    const backWrapper = screen.getByTestId("back-content")
      .parentElement as HTMLElement;
    expect(backWrapper).toBeInTheDocument();
    expect(backWrapper).toHaveStyle({
      position: "absolute",
      top: "0px",
      left: "0px",
      width: "100%",
      height: "100%",
      transform: "rotateY(180deg)",
    });
    // Check backfaceVisibility directly
    expect(backWrapper.style.backfaceVisibility).toBe("hidden");
  });
});
