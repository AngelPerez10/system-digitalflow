declare module "*.svg?react" {
  import type { SVGProps } from "react";
  /** Explicit element return — avoids React 19 `FC`/`ReactNode | Promise` JSX clashes. */
  export const ReactComponent: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  const src: string;
  export default src;
}
