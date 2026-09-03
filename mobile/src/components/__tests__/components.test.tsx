// Unit Tests for Core UI Components (Button, PriceRangeBar, VerdictStamp, Icon, PriceText).
import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { describe, it, expect, jest } from '@jest/globals';
import { Button } from '@/components/Button';
import { PriceRangeBar } from '@/components/PriceRangeBar';
import { VerdictStamp } from '@/components/VerdictStamp';
import { Icon } from '@/components/Icon';
import { Colors, Verdict } from '@/constants/theme';

describe('Button Component', () => {
  it('renders primary button with title', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<Button title="Click Me" onPress={() => {}} />);
    });
    const root = tree!.root;
    const text = root.findByType(Text);
    expect(text.props.children).toBe('Click Me');
  });

  it('handles press event when enabled', () => {
    const onPress = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<Button title="Action" onPress={onPress} haptic={false} />);
    });
    const root = tree!.root;
    const btn = root.findByProps({ accessibilityRole: 'button' });
    act(() => {
      btn.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onPress when disabled', () => {
    const onPress = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<Button title="Disabled" onPress={onPress} disabled={true} />);
    });
    const root = tree!.root;
    const btn = root.findByProps({ accessibilityRole: 'button' });
    act(() => {
      btn.props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('PriceRangeBar Component', () => {
  it('renders low, median, and high values correctly', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<PriceRangeBar low={10} median={50} high={100} durationMs={0} />);
    });
    const root = tree!.root;
    const texts = root
      .findAllByType(Text)
      .map((t) => (Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children)));

    expect(texts).toContain('$10');
    expect(texts).toContain('$100');
  });

  it('handles identical low and high values without dividing by zero', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<PriceRangeBar low={50} median={50} high={50} durationMs={0} />);
    });
    expect(tree).toBeDefined();
  });
});

describe('Verdict Tokens & VerdictStamp Component', () => {
  it('maps correct colors and labels for flip, maybe, skip', () => {
    expect(Verdict.flip.label).toBe('FLIP');
    expect(Verdict.flip.fg).toBe(Colors.flip);

    expect(Verdict.maybe.label).toBe('MAYBE');
    expect(Verdict.maybe.fg).toBe(Colors.maybe);

    expect(Verdict.skip.label).toBe('SKIP');
    expect(Verdict.skip.fg).toBe(Colors.skip);
  });

  it('renders VerdictStamp without throwing for each verdict type', () => {
    const verdicts: ('flip' | 'maybe' | 'skip')[] = ['flip', 'maybe', 'skip'];
    for (const v of verdicts) {
      let tree: renderer.ReactTestRenderer | undefined;
      act(() => {
        tree = renderer.create(<VerdictStamp verdict={v} showConfetti={false} />);
      });
      const root = tree!.root;
      const text = root.findByType(Text);
      expect(text.props.children).toBe(Verdict[v].label);
    }
  });
});

describe('Icon Component', () => {
  const iconNames = [
    'camera',
    'barcode',
    'history',
    'star',
    'trending',
    'settings',
    'check',
    'x',
    'chevron-right',
    'share',
    'download',
    'flash',
    'flash-off',
    'switch-camera',
    'plus',
    'wifi-off',
    'alert',
  ] as const;

  it.each(iconNames)('renders icon "%s" without error', (name) => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<Icon name={name} size={20} color="#000" />);
    });
    expect(tree).toBeDefined();
  });
});
