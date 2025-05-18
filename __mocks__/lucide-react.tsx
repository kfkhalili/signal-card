// __mocks__/lucide-react.tsx
import React from "react";

// Define a generic mock icon component
const MockLucideIcon: React.FC<
  React.SVGProps<SVGSVGElement> & {
    "data-lucide-icon-name": string;
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }
> = (props) => {
  const {
    size,
    color,
    strokeWidth,
    "data-lucide-icon-name": iconName,
    ...rest
  } = props;
  return (
    <svg
      data-testid={`mock-lucide-icon-${iconName.toLowerCase()}`}
      data-lucide-icon-name={iconName}
      width={typeof size === "number" ? size : 24}
      height={typeof size === "number" ? size : 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth={
        typeof strokeWidth === "number" || typeof strokeWidth === "string"
          ? strokeWidth
          : 2
      }
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    />
  );
};

// Explicitly export the icons used by SocialBar.tsx
export const ThumbsUp: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <MockLucideIcon {...props} data-lucide-icon-name="ThumbsUp" />
);
export const MessageCircle: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => <MockLucideIcon {...props} data-lucide-icon-name="MessageCircle" />;
export const Bookmark: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <MockLucideIcon {...props} data-lucide-icon-name="Bookmark" />
);
export const Share2: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <MockLucideIcon {...props} data-lucide-icon-name="Share2" />
);

const AllIconsProxy = new Proxy(
  {},
  {
    get: function (_target, propKey) {
      if (propKey === "__esModule") {
        return true;
      }
      if (propKey === "ThumbsUp") return ThumbsUp;
      if (propKey === "MessageCircle") return MessageCircle;
      if (propKey === "Bookmark") return Bookmark;
      if (propKey === "Share2") return Share2;

      const GenericMock: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
        <MockLucideIcon {...props} data-lucide-icon-name={String(propKey)} />
      );
      GenericMock.displayName = `LucideMockProxy(${String(propKey)})`;
      return GenericMock;
    },
  }
);

export default AllIconsProxy;
