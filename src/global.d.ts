export declare global {
  interface Window {
    System: {
      import: (identifier: string) => Promise<Module>;
    };
  }

  interface Module {
    default?: any;
    [exportName: string]: any;
  }
}
