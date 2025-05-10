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
    render(
      <ClickableDataItem isInteractive={false} baseClassName={baseClass}>
        {childText}
      </ClickableDataItem>
    );
    expect(screen.getByText(childText).parentElement).toHaveClass(baseClass);
  });

  describe("when isInteractive is true", () => {
    const interactiveClass = "my-interactive-class";
    const ariaLabel = "Test Action";

    test("applies interactiveClassName", () => {
      render(
        <ClickableDataItem
          isInteractive={true}
          interactiveClassName={interactiveClass}
          onClickHandler={mockOnClickHandler}
        >
          {childText}
        </ClickableDataItem>
      );
      expect(screen.getByText(childText).parentElement).toHaveClass(
        interactiveClass
      );
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

    test("calls onClickHandler and event.preventDefault on Enter key press", () => {
      const mockPreventDefault = jest.fn();
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
      fireEvent.keyDown(element, {
        key: "Enter",
        code: "Enter",
        preventDefault: mockPreventDefault,
      });
      expect(mockOnClickHandler).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    });

    test("calls onClickHandler and event.preventDefault on Space key press", () => {
      const mockPreventDefault = jest.fn();
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
      fireEvent.keyDown(element, {
        key: " ",
        code: "Space",
        preventDefault: mockPreventDefault,
      });
      expect(mockOnClickHandler).toHaveBeenCalledTimes(1);
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    });
  });

  describe("when isInteractive is false", () => {
    test("does not apply interactiveClassName", () => {
      const interactiveClass = "my-interactive-class";
      render(
        <ClickableDataItem
          isInteractive={false}
          interactiveClassName={interactiveClass}
        >
          {childText}
        </ClickableDataItem>
      );
      expect(screen.getByText(childText).parentElement).not.toHaveClass(
        interactiveClass
      );
    });

    test('does not set ARIA role="button" or tabIndex={0}', () => {
      render(
        <ClickableDataItem isInteractive={false}>{childText}</ClickableDataItem>
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      // Check tabIndex is not 0 (could be undefined or -1 depending on impl)
      const element = screen.getByText(childText).parentElement;
      expect(element).not.toHaveAttribute("tabindex", "0");
      if (element?.hasAttribute("tabindex")) {
        expect(element).toHaveAttribute("tabindex", "-1"); // or undefined based on strictness
      }
    });

    test("does not call onClickHandler on click", () => {
      render(
        <ClickableDataItem
          isInteractive={false}
          onClickHandler={mockOnClickHandler}
        >
          {childText}
        </ClickableDataItem>
      );
      fireEvent.click(screen.getByText(childText));
      expect(mockOnClickHandler).not.toHaveBeenCalled();
    });

    test("does not call onClickHandler on Enter/Space key press", () => {
      render(
        <ClickableDataItem
          isInteractive={false}
          onClickHandler={mockOnClickHandler}
        >
          {childText}
        </ClickableDataItem>
      );
      const element = screen.getByText(childText).parentElement as HTMLElement;
      fireEvent.keyDown(element, { key: "Enter", code: "Enter" });
      fireEvent.keyDown(element, { key: " ", code: "Space" });
      expect(mockOnClickHandler).not.toHaveBeenCalled();
    });
  });
});
