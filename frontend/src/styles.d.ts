interface ImportMetaEnv {
  readonly VITE_DEMO_GOVERNMENT_EMAIL?: string;
  readonly VITE_DEMO_GOVERNMENT_PASSWORD?: string;
  readonly VITE_DEMO_CITIZEN_EMAIL?: string;
  readonly VITE_DEMO_CITIZEN_PASSWORD?: string;
  readonly VITE_DEMO_SIGNUP_GOVERNMENT_EMAIL?: string;
  readonly VITE_DEMO_SIGNUP_CITIZEN_EMAIL?: string;
  readonly VITE_DEMO_SIGNUP_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {
  const content: Readonly<Record<string, string>>;
  export default content;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}