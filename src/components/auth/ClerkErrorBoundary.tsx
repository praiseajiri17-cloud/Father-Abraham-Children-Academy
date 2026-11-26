import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ClerkErrorBoundaryProps {
  children: ReactNode;
  fallback: (errorMessage: string) => ReactNode;
}

interface ClerkErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ClerkErrorBoundary extends Component<
  ClerkErrorBoundaryProps,
  ClerkErrorBoundaryState
> {
  public state: ClerkErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ClerkErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Authentication service failed to initialize.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Clerk initialization error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.errorMessage);
    }
    return this.props.children;
  }
}
