// src/components/game/cards/base-card/BaseCard.stories.tsx
import React, { useState, useCallback, useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import BaseCard from "./BaseCard";
import type {
  CardActionContext,
  OnGenericInteraction,
  CardType,
  InteractionPayload,
  RequestNewCardInteraction,
  NavigateExternalInteraction,
} from "./base-card.types";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

const meta: Meta<typeof BaseCard> = {
  title: "Game/Cards/BaseCard",
  component: BaseCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    isFlipped: { control: "boolean" },
    faceContent: { control: "object" },
    backContent: { control: "object" },
    cardContext: { control: "object" },
    onDeleteRequest: { action: "onDeleteRequest" },
    onFlip: { action: "onFlip" },
    onGenericInteraction: { action: "onGenericInteraction" },
    className: { control: "text" },
    innerCardClassName: { control: "text" },
  },
};

export default meta;

interface BaseCardStoryWrapperProps
  extends Omit<
    React.ComponentProps<typeof BaseCard>,
    "isFlipped" | "onFlip" | "faceContent" | "backContent"
  > {
  initialIsFlipped: boolean;
  initialFaceContent: React.ReactNode;
  initialBackContent: React.ReactNode;
}

const BaseCardStoryWrapper: React.FC<BaseCardStoryWrapperProps> = ({
  initialIsFlipped,
  initialFaceContent,
  initialBackContent,
  cardContext: propCardContext,
  onDeleteRequest,
  className,
  innerCardClassName,
  children,
  onGenericInteraction,
}) => {
  const [isFlipped, setIsFlipped] = useState(initialIsFlipped);
  const [faceContent, setFaceContent] =
    useState<React.ReactNode>(initialFaceContent);
  const [backContent, setBackContent] =
    useState<React.ReactNode>(initialBackContent);

  useEffect(() => {
    setIsFlipped(initialIsFlipped);
  }, [initialIsFlipped]);

  useEffect(() => {
    setFaceContent(initialFaceContent);
  }, [initialFaceContent]);

  useEffect(() => {
    setBackContent(initialBackContent);
  }, [initialBackContent]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
    action("onFlip")(); // Log the onFlip action
  }, []);

  if (!propCardContext || !onGenericInteraction) {
    return <div>Error: Essential props missing for BaseCardStoryWrapper.</div>;
  }

  return (
    <BaseCard
      isFlipped={isFlipped}
      faceContent={faceContent}
      backContent={backContent}
      cardContext={propCardContext}
      onDeleteRequest={onDeleteRequest}
      onFlip={handleFlip}
      className={className}
      innerCardClassName={innerCardClassName}
      onGenericInteraction={onGenericInteraction}>
      {children}
    </BaseCard>
  );
};

const mockCardContextDefault: CardActionContext = {
  id: "base-story-1",
  symbol: "STCK",
  type: "price", // Or any valid CardType
  companyName: "Storybook Inc.",
  logoUrl: "https://picsum.photos/seed/storylogo/40/40",
  websiteUrl: "https://storybook.js.org",
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  // Create a specific, easily identifiable log message for Playwright
  const playwrightLogMessage = `PLAYWRIGHT_TEST_ACTION: onGenericInteraction triggered - Intent: ${
    payload.intent
  }, Type: ${payload.sourceCardType}, Origin: ${
    payload.originatingElement || "N/A"
  }`;
  console.log(playwrightLogMessage); // This is for Playwright to catch

  action("onGenericInteraction")(payload); // This is for Storybook's UI and general logging
};

const mockOnDeleteRequest = (context: CardActionContext) => {
  // Create a specific, easily identifiable log message for Playwright
  const playwrightLogMessage = `PLAYWRIGHT_TEST_ACTION: onDeleteRequest triggered - Card ID: ${context.id}`;
  console.log(playwrightLogMessage); // This is for Playwright to catch

  action("onDeleteRequest")(context); // This is for Storybook's UI and general logging
};

const SimpleFaceContent: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-4 text-center">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">
      This is the {title.toLowerCase()} of the card.
    </p>
    <Button
      size="sm"
      className="mt-4"
      data-interactive-child="true"
      onClick={(e) => {
        e.stopPropagation();
        action("faceButton Clicked")();
      }}>
      Face Button
    </Button>
  </div>
);

const SimpleBackContent: React.FC<{
  onGenericInteraction: OnGenericInteraction;
  cardId: string;
  cardSymbol: string;
  cardType: CardType;
}> = ({ onGenericInteraction, cardId, cardSymbol, cardType }) => (
  <div className="p-4 text-center">
    <h3 className="text-lg font-semibold mb-2">Back Content</h3>
    <p className="text-sm text-muted-foreground">Details on the back.</p>
    <Button
      variant="secondary"
      size="sm"
      className="mt-2"
      data-interactive-child="true"
      onClick={(e) => {
        e.stopPropagation();
        const payload: RequestNewCardInteraction = {
          intent: "REQUEST_NEW_CARD",
          sourceCardId: cardId,
          sourceCardSymbol: cardSymbol,
          sourceCardType: cardType,
          targetCardType: "profile", // Example target
          originatingElement: "backContentButton",
        };
        onGenericInteraction(payload);
        action("onGenericInteraction (REQUEST_NEW_CARD from back)")(payload);
      }}>
      Request Profile Card
    </Button>
    <Button
      variant="link"
      size="sm"
      className="mt-2"
      data-interactive-child="true"
      onClick={(e) => {
        e.stopPropagation();
        const payload: NavigateExternalInteraction = {
          intent: "NAVIGATE_EXTERNAL",
          sourceCardId: cardId,
          sourceCardSymbol: cardSymbol,
          sourceCardType: cardType,
          url: "https://example.com",
          navigationTargetName: "Example Site",
          originatingElement: "backContentLink",
        };
        onGenericInteraction(payload);
        action("onGenericInteraction (NAVIGATE_EXTERNAL from back)")(payload);
      }}>
      Visit Example.com
    </Button>
  </div>
);

type Story = StoryObj<BaseCardStoryWrapperProps>;

export const Default: Story = {
  render: (args) => <BaseCardStoryWrapper {...args} />,
  args: {
    initialIsFlipped: false,
    initialFaceContent: <SimpleFaceContent title="Card Front" />,
    initialBackContent: (
      <SimpleBackContent
        onGenericInteraction={mockOnGenericInteraction}
        cardId={mockCardContextDefault.id}
        cardSymbol={mockCardContextDefault.symbol}
        cardType={mockCardContextDefault.type}
      />
    ),
    cardContext: mockCardContextDefault,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[280px] h-[392px] sm:w-[300px] sm:h-[420px]", // Example dimensions
  },
};

export const Flipped: Story = {
  render: (args) => <BaseCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: true,
  },
};

export const NoLogoNoWebsite: Story = {
  render: (args) => <BaseCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    cardContext: {
      ...mockCardContextDefault,
      companyName: "No Logo Corp",
      logoUrl: null,
      websiteUrl: null,
    },
  },
};

export const LongCompanyName: Story = {
  render: (args) => <BaseCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    cardContext: {
      ...mockCardContextDefault,
      companyName:
        "The Extremely Long Company Name That Might Cause Wrapping or Truncation Issues Incorporated Limited",
      symbol: "ELCNTWCOTIIL",
    },
    initialBackContent: (
      <SimpleBackContent
        onGenericInteraction={mockOnGenericInteraction}
        cardId={mockCardContextDefault.id}
        cardSymbol={"ELCNTWCOTIIL"}
        cardType={mockCardContextDefault.type}
      />
    ),
  },
};

export const NoDeleteButton: Story = {
  render: (args) => <BaseCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    onDeleteRequest: undefined, // Simulate no delete handler provided
  },
};

export const CustomStyling: Story = {
  render: (args) => <BaseCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    className:
      "w-[320px] h-[448px] border-4 border-blue-500 rounded-xl shadow-2xl",
    innerCardClassName: "bg-gradient-to-br from-purple-400 to-pink-500",
    initialFaceContent: (
      <div className="p-4 text-white">
        <h3 className="text-xl font-bold">Styled Front</h3>
        <p>With custom background.</p>
        <Heart className="mx-auto mt-4" size={48} />
      </div>
    ),
    initialBackContent: (
      <div className="p-4 text-white">
        <h3 className="text-xl font-bold">Styled Back</h3>
        <p>Also with custom style.</p>
      </div>
    ),
  },
};
