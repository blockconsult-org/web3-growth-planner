import { Component, type ReactNode } from 'react';
export type ErrorInfo = { reset: () => void };
export function catchError<P extends object>(Fallback: (props: P, error: ErrorInfo) => ReactNode) {
  return class Boundary extends Component<P & { children?: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? Fallback(this.props, { reset: () => this.setState({ failed: false }) }) : this.props.children; }
  };
}
