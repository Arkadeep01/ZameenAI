import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: "main" | "div" | "section";
}

/**
 * The ONE page shell for every Citizen Portal page.
 *
 * Layout contract (global responsive behaviour):
 *   - `w-full` + `min-w-0` + `box-border` so the page always fills the width
 *     the sidebar leaves available, at every viewport / zoom level.
 *   - Horizontal padding is fluid (16px → 24px → 32px) rather than a fixed
 *     gutter, so content is never trapped in a narrow centred column.
 *   - There is deliberately NO `max-w-*` and NO `mx-auto`: at 1600px+ the
 *     content uses the full available width instead of a small centred box.
 *   - `min-h-*` is intentionally omitted. The parent `<main>` already supplies
 *     the viewport height, so a nested `min-h-screen` would add a screen of
 *     dead space below the fold.
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = "",
  as: Component = "div",
}) => {
  return (
    <Component
      className={`w-full min-w-0 box-border bg-[#F4F8FB] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 ${className}`}
    >
      {children}
    </Component>
  );
};

export default PageContainer;
