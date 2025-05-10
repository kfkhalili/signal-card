import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ClickableDataItem } from "./ClickableDataItem"; // Adjust path as needed

// Mock cn utility
jest.mock("@/lib/utils", () => ({
  cn: (...args: Array<string | undefined | null | boolean>) =>
    args.filter(Boolean).join(" "),
}));

describe("ClickableDataItem Component", () => {
  const mockOnClickHandler = jest.fn();
  const childText = "Clickable Text";

  beforeEach(() => {
    mockOnClickHandler.mockClear();
  });

  test("renders children", () => {
    render(
      <ClickableDataItem isInteractive={false}>{childText}</ClickableDataItem>
    );
    expect(screen.getByText(childText)).toBeInTheDocument();
  });

  test("applies baseClassName", () => {
    const baseClass = "my-base-class";
    const { container } = render(
      <ClickableDataItem isInteractive={false} baseClassName={baseClass}>
        {childText}
      </ClickableDataItem>
    );
    expect(container.firstChild).toHaveClass(baseClass);
  });

  describe("when isInteractive is true", () => {
    const interactiveClass = "my-interactive-class";
    const ariaLabel = "Test Action";

    test("applies interactiveClassName", () => {
      const { container } = render(
        <ClickableDataItem
          isInteractive={true}
          interactiveClassName={interactiveClass}
          onClickHandler={mockOnClickHandler}
        >
          {childText}
        </ClickableDataItem>
      );
      expect(container.firstChild).toHaveClass(interactiveClass);
      // Also ensure baseClass is applied if present
      const baseClass = "base-class-too";
      const { container: containerWithBase } = render(
        <ClickableDataItem
          isInteractive={true}
          baseClassName={baseClass}
          interactiveClassName={interactiveClass}
          onClickHandler={mockOnClickHandler}
        >
          {childText}
        </ClickableDataItem>
      );
      expect(containerWithBase.firstChild).toHaveClass(baseClass);
      expect(containerWithBase.firstChild).toHaveClass(interactiveClass);
    });

    test('sets ARIA role="button", tabIndex={0}, and aria-label', () => {
      render(
        <ClickableDataItem
          isInteractive={true}
          onClickHandler={mockOnClickHandler}
          aria-label={ariaLabel}
        >
          {childText}
        </ClickableDataItem>
      );
      const element = screen.getByRole("button", { name: ariaLabel });
      expect(element).toBeInTheDocument();
      expect(element).toHaveAttribute("tabindex", "0");
    });

    test("calls onClickHandler on click", () => {
      render(
        <ClickableDataItem
          isInteractive={true}
          onClickHandler={mockOnClickHandler}
          aria-label={ariaLabel}
        >
          {childText}
        </ClickableDataItem>
      );
      fireEvent.click(screen.getByRole("button", { name: ariaLabel }));
      expect(mockOnClickHandler).toHaveBeenCalledTimes(1);
    });

    test("calls onClickHandler and event.preventDefault is true for Enter key press", () => {
      render(
        <ClickableDataItem
          isInteractive={true}
          onClickHandler={mockOnClickHandler}
          aria-label={ariaLabel}
        >
          {childText}
        </ClickableDataItem>
      );
      const element = screen.getByRole("button", { name: ariaLabel });
      const eventWasNotPrevented = fireEvent.keyDown(element, {
        key: "Enter",
        code: "Enter",
      });

      expect(mockOnClickHandler).toHaveBeenCalledTimes(1);
      expect(eventWasNotPrevented).toBe(false); // false means preventDefault was called
    });

    test("calls onClickHandler and event.preventDefault is true for Space key press", () => {
      render(
        <ClickableDataItem
          isInteractive={true}
          onClickHandler={mockOnClickHandler}
          aria-label={ariaLabel}
        >
          {childText}
        </ClickableDataItem>
      );
      const element = screen.getByRole("button", { name: ariaLabel });
      const eventWasNotPrevented = fireEvent.keyDown(element, {
        key: " ",
        code: "Space",
      });
      expect(mockOnClickHandler).toHaveBeenCalledTimes(1);
      expect(eventWasNotPrevented).toBe(false); // false means preventDefault was called
    });
  });

  describe("when isInteractive is false", () => {
    test("does not apply interactiveClassName", () => {
      const interactiveClass = "my-interactive-class";
      const { container } = render(
        <ClickableDataItem
          isInteractive={false}
          interactiveClassName={interactiveClass}
        >
          {childText}
        </ClickableDataItem>
      );
      expect(container.firstChild).not.toHaveClass(interactiveClass);
    });

    test('does not set ARIA role="button" and tabIndex is undefined or -1', () => {
      const { container } = render(
        <ClickableDataItem isInteractive={false}>{childText}</ClickableDataItem>
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(container.firstChild).not.toHaveAttribute("tabindex", "0");
      // Check it explicitly has undefined tabindex or -1 if that's the behavior
      // For this component, it will be undefined if not interactive, which is fine.
      // If it had tabIndex={isInteractive ? 0 : -1}, then check for -1.
    });

    test("does not call onClickHandler on click", () => {
      const { container } = render(
        <ClickableDataItem
          isInteractive={false}
          onClickHandler={mockOnClickHandler}
        >
          {childText}
        </ClickableDataItem>
      );
      fireEvent.click(container.firstChild as HTMLElement);
      expect(mockOnClickHandler).not.toHaveBeenCalled();
    });

    test("does not call onClickHandler on Enter/Space key press", () => {
      const { container } = render(
        <ClickableDataItem
          isInteractive={false}
          onClickHandler={mockOnClickHandler}
        >
          {childText}
        </ClickableDataItem>
      );
      const element = container.firstChild as HTMLElement;
      fireEvent.keyDown(element, { key: "Enter", code: "Enter" });
      fireEvent.keyDown(element, { key: " ", code: "Space" });
      expect(mockOnClickHandler).not.toHaveBeenCalled();
    });
  });
});
