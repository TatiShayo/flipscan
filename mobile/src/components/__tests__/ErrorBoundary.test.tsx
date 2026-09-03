// Unit Tests for the React Native ErrorBoundary Component.
import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import * as monitoring from '@/lib/monitoring';

jest.mock('@/lib/monitoring', () => ({
  captureError: jest.fn(),
}));

function CrashingComponent({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) {
    throw new Error('Simulated render error');
  }
  return <Text>Child content renders safely</Text>;
}

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children normally when no error occurs', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary>
          <CrashingComponent shouldCrash={false} />
        </ErrorBoundary>,
      );
    });

    const root = tree!.root;
    expect(root.findByType(Text).props.children).toBe('Child content renders safely');
  });

  it('catches render error, logs to monitoring, and displays fallback UI', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary>
          <CrashingComponent shouldCrash={true} />
        </ErrorBoundary>,
      );
    });

    const root = tree!.root;
    const texts = root.findAllByType(Text);
    const titleText = texts.find((t) => t.props.children === 'Something went wrong');
    expect(titleText).toBeTruthy();

    expect(monitoring.captureError).toHaveBeenCalledTimes(1);
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <Text>Custom error screen</Text>;

    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary fallback={customFallback}>
          <CrashingComponent shouldCrash={true} />
        </ErrorBoundary>,
      );
    });

    const root = tree!.root;
    const customText = root.findAllByType(Text).find((t) => t.props.children === 'Custom error screen');
    expect(customText).toBeTruthy();
  });

  it('getDerivedStateFromError sets hasError to true and stores error', () => {
    const err = new Error('Test error');
    const state = ErrorBoundary.getDerivedStateFromError(err);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(err);
  });

  it('handleReset clears error state and invokes onReset prop', () => {
    const onReset = jest.fn();
    const boundary = new ErrorBoundary({ children: null, onReset });
    boundary.setState = (newState, cb) => {
      Object.assign(
        boundary.state,
        typeof newState === 'function' ? newState(boundary.state, boundary.props) : newState,
      );
      cb?.();
    };
    boundary.state = { hasError: true, error: new Error('boom') };

    boundary.handleReset();

    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBeNull();
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
