import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../AppIcon';

const LAST_PROMPT_ID_KEY = 'isf-last-supportive-prompt-id';

const shuffleIndexes = (length) => {
  const indexes = Array.from({ length }, (_, idx) => idx);
  for (let idx = indexes.length - 1; idx > 0; idx -= 1) {
    const randomIdx = Math.floor(Math.random() * (idx + 1));
    [indexes[idx], indexes[randomIdx]] = [indexes[randomIdx], indexes[idx]];
  }
  return indexes;
};

const createPromptOrder = (length, avoidFirstIndex = -1) => {
  if (length <= 1) return [0];
  const order = shuffleIndexes(length);
  if (avoidFirstIndex >= 0 && order[0] === avoidFirstIndex) {
    const swapIdx = order.findIndex((value) => value !== avoidFirstIndex);
    if (swapIdx > 0) {
      [order[0], order[swapIdx]] = [order[swapIdx], order[0]];
    }
  }
  return order;
};

const SupportivePrompts = ({ prompts = [], onSelect, onSkip }) => {
  const [promptOrder, setPromptOrder] = useState([0]);
  const [orderPosition, setOrderPosition] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const defaultPrompts = [
    {
      id: 1,
      text: "What\'s something you\'re curious about today?",
      category: 'reflection'
    },
    {
      id: 2,
      text: "Share a small win from this week",
      category: 'celebration'
    },
    {
      id: 3,
      text: "What helps you feel most comfortable in conversations?",
      category: 'connection'
    },
    {
      id: 4,
      text: 'What small step would make today feel easier?',
      category: 'support'
    },
    {
      id: 5,
      text: 'What is one kind thing you can do for yourself right now?',
      category: 'self-care'
    },
    {
      id: 6,
      text: 'What topic would feel safe and easy to talk about today?',
      category: 'connection'
    }
  ];

  const displayPrompts = prompts?.length > 0 ? prompts : defaultPrompts;
  const promptSignature = useMemo(
    () => displayPrompts.map((prompt) => String(prompt?.id ?? prompt?.text ?? '')).join('|'),
    [displayPrompts]
  );
  const currentPromptIndex = promptOrder?.[orderPosition] ?? 0;
  const currentPrompt = displayPrompts?.[currentPromptIndex];

  useEffect(() => {
    if (!displayPrompts.length) return;

    let lastPromptIndex = -1;
    try {
      const lastPromptId = localStorage.getItem(LAST_PROMPT_ID_KEY);
      if (lastPromptId) {
        lastPromptIndex = displayPrompts.findIndex(
          (prompt) => String(prompt?.id ?? '') === String(lastPromptId)
        );
      }
    } catch {
      lastPromptIndex = -1;
    }

    setPromptOrder(createPromptOrder(displayPrompts.length, lastPromptIndex));
    setOrderPosition(0);
  }, [promptSignature]);

  useEffect(() => {
    if (!currentPrompt?.id) return;
    try {
      localStorage.setItem(LAST_PROMPT_ID_KEY, String(currentPrompt.id));
    } catch {
      // no-op when storage is unavailable
    }
  }, [currentPrompt?.id]);

  const handleNext = () => {
    if (!displayPrompts.length) return;
    if (orderPosition < displayPrompts.length - 1) {
      setOrderPosition(orderPosition + 1);
      return;
    }

    setPromptOrder(createPromptOrder(displayPrompts.length, currentPromptIndex));
    setOrderPosition(0);
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(currentPrompt);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-gentle transition-gentle">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <Icon name="Lightbulb" size={20} color="var(--color-accent)" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">
              Gentle Prompt
            </h3>
            <p className="caption text-muted-foreground">
              Optional conversation starter
            </p>
          </div>
        </div>
        <button
          onClick={handleSkip}
          className="p-2 rounded-lg hover:bg-muted transition-gentle"
          aria-label="Close prompt"
        >
          <Icon name="X" size={18} color="var(--color-muted-foreground)" />
        </button>
      </div>
      <div className="mb-6">
        <p className="text-foreground font-body text-lg leading-relaxed">
          {currentPrompt?.text}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={handleNext}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-gentle caption"
        >
          <Icon name="RefreshCw" size={16} color="currentColor" />
          <span>Try another</span>
        </button>

        <button
          onClick={handleSelect}
          className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:shadow-gentle-md transition-gentle font-body font-medium"
        >
          <span>Use this prompt</span>
          <Icon name="ArrowRight" size={18} color="var(--color-primary-foreground)" />
        </button>
      </div>
      <div className="flex items-center justify-center mt-4">
        <span className="caption text-muted-foreground">
          Prompt {Math.min(orderPosition + 1, displayPrompts.length)} of {displayPrompts.length}
        </span>
      </div>
    </div>
  );
};

export default SupportivePrompts;
