// Error Boundary Component — catches uncaught rendering errors gracefully.
// Shows a warm, themed fallback with retry affordance and logs errors to Sentry/monitoring.
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import { captureError } from '@/lib/monitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    captureError(error, {
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Icon name="alert" size={32} color={Colors.skip} />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              FlipScan ran into an unexpected error. Your scan history is safe.
            </Text>
            {__DEV__ && this.state.error && (
              <View style={styles.devBox}>
                <Text style={styles.devErrorText} numberOfLines={4}>
                  {this.state.error.message}
                </Text>
              </View>
            )}
            <Pressable
              onPress={this.handleReset}
              style={styles.retryButton}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    maxWidth: 360,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.skipSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Type.heading,
    color: Colors.ink,
    textAlign: 'center',
  },
  message: {
    ...Type.bodySm,
    color: Colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  devBox: {
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    width: '100%',
    marginVertical: Spacing.sm,
  },
  devErrorText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.skip,
  },
  retryButton: {
    backgroundColor: Colors.flip,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  retryButtonText: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 15,
    color: Colors.white,
  },
});
