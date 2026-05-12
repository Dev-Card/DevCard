import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import type { Card } from '@devcard/shared';
import CardPickerSheet from '../src/components/CardPickerSheet';

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  return {
    BottomSheetModal: React.forwardRef(({ children }: any, _ref: any) => (
      <>{children}</>
    )),
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: any) => <>{children}</>,
  };
});

const buildCard = (overrides: Partial<Card>): Card => ({
  id: 'card-1',
  title: 'Professional',
  isDefault: false,
  links: [
    {
      id: 'link-1',
      platform: 'github',
      username: 'octocat',
      url: 'https://github.com/octocat',
      displayOrder: 0,
    },
  ],
  ...overrides,
});

const extractText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  return extractText(node.props?.children);
};

describe('CardPickerSheet', () => {
  test('renders card titles and link counts', () => {
    const cards: Card[] = [
      buildCard({ id: 'card-1', title: 'Professional' }),
      buildCard({
        id: 'card-2',
        title: 'Hackathon',
        links: [
          {
            id: 'link-2',
            platform: 'twitter',
            username: 'dev',
            url: 'https://x.com/dev',
            displayOrder: 0,
          },
          {
            id: 'link-3',
            platform: 'linkedin',
            username: 'dev',
            url: 'https://linkedin.com/in/dev',
            displayOrder: 1,
          },
        ],
      }),
    ];

    const renderer = ReactTestRenderer.create(
      <CardPickerSheet cards={cards} selectedCardId={null} onSelect={() => {}} />
    );

    const textNodes = renderer.root.findAllByType(Text).map(node => extractText(node));
    expect(textNodes).toContain('Professional');
    expect(textNodes).toContain('Hackathon');
    expect(textNodes).toContain('1 links');
    expect(textNodes).toContain('2 links');
  });

  test('calls onSelect when a card is selected', () => {
    const cards: Card[] = [
      buildCard({ id: 'card-1', title: 'Professional' }),
      buildCard({ id: 'card-2', title: 'Hackathon' }),
    ];
    const onSelect = jest.fn();

    const renderer = ReactTestRenderer.create(
      <CardPickerSheet cards={cards} selectedCardId="card-2" onSelect={onSelect} />
    );

    const buttons = renderer.root.findAllByType(TouchableOpacity);
    const selectButton = buttons.find(button => {
      const labels = button.findAllByType(Text).map(node => extractText(node));
      return labels.includes('Select');
    });

    ReactTestRenderer.act(() => {
      selectButton?.props.onPress();
    });

    expect(onSelect).toHaveBeenCalledWith('card-1');
  });

  test('shows empty state when only one card exists', () => {
    const cards: Card[] = [buildCard({ id: 'card-1' })];

    const renderer = ReactTestRenderer.create(
      <CardPickerSheet cards={cards} selectedCardId="card-1" onSelect={() => {}} />
    );

    const textNodes = renderer.root.findAllByType(Text).map(node => extractText(node));
    expect(textNodes).toContain('Create another card in Cards tab');
  });
});
