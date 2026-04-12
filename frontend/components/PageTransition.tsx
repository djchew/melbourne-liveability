"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Start as loading (overlay visible)
    setIsLoading(true);
    // After a tiny delay for DOM to update, fade out overlay to reveal new content
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {/* Overlay - starts opaque, fades out to reveal content */}
      <div
        className="fixed inset-0 bg-white pointer-events-none z-50 transition-opacity duration-500"
        style={{
          opacity: isLoading ? 1 : 0,
        }}
        aria-hidden="true"
      />

      {/* Page content - always visible underneath overlay */}
      {children}
    </>
  );
}
