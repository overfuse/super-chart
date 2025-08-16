import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Unhandled error in app:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto w-[1002px] p-4">
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            Something went wrong
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


