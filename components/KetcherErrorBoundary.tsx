"use client";

import { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class KetcherErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        // Always update state to show error UI
        // We cannot suppress errors here as it would cause an infinite render loop
        // for errors thrown during the render phase
        return { hasError: true, error };
    }

    componentDidCatch() {
        // Error caught and displayed in fallback UI
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex items-center justify-center h-full">
                    <div className="text-destructive">Something went wrong loading the editor.</div>
                </div>
            );
        }

        return this.props.children;
    }
}
