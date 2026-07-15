declare module 'react-katex' {
  export const InlineMath: React.ComponentType<{ math: string; errorColor?: string; renderError?: (e: Error) => React.ReactNode }>;
  export const BlockMath: React.ComponentType<{ math: string; errorColor?: string; renderError?: (e: Error) => React.ReactNode }>;
  const _default: any;
  export default _default;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module 'sonner' {
  export const toast: any;
  export const Toaster: any;
  export default any;
}

