"use client";

import React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "assist-widget": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export function AssistWidget(props: { endpoint?: string }) {
  // In real usage, the custom element is used directly.
  // This thin wrapper ensures client-side and can pass props if extended.
  React.useEffect(() => {
    // Ensure defined
    import("@wayfinder/widget").then(() => {});
  }, []);

  return React.createElement("assist-widget", {
    "data-endpoint": props.endpoint || "/api/assist/chat",
  } as any);
}
