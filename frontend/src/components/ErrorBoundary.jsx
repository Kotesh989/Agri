import { Component } from 'react';
import { showError } from '../utils/notificationService';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
    showError('Something went wrong. Please reload the page or try again.');
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8">
          <div className="max-w-lg rounded-3xl border border-slate-700 bg-slate-900/95 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-3xl font-semibold mb-4">Something went wrong</h1>
            <p className="mb-6 text-slate-300">An unexpected error occurred. You can retry to continue using the app.</p>
            <button onClick={this.handleRetry} className="btn btn-primary">
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
