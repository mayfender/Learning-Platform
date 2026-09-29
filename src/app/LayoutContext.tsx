import { createContext, useContext } from 'react';

export const LogoLongPressContext = createContext<(() => void) | undefined>(undefined);

export function useLogoLongPressOverride(): (() => void) | undefined {
  return useContext(LogoLongPressContext);
}
