/* eslint-disable react-refresh/only-export-components -- context, provider และ hook อยู่ไฟล์เดียวกันตามรูปแบบมาตรฐาน */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export const LogoLongPressContext = createContext<(() => void) | undefined>(undefined);
const LogoLongPressRegisterContext = createContext<(handler: (() => void) | undefined) => void>(
  () => {},
);

export function useLogoLongPressOverride(): (() => void) | undefined {
  return useContext(LogoLongPressContext);
}

// หน้าที่อยู่ใต้ Layout (เช่น Play) ลงทะเบียน handler ของตัวเองผ่าน hook นี้
export function useRegisterLogoLongPress(): (handler: (() => void) | undefined) => void {
  return useContext(LogoLongPressRegisterContext);
}

// ต้องครอบเหนือ Layout เพื่อให้ Layout เห็นค่า override
export function LogoLongPressProvider({ children }: { children: ReactNode }) {
  const [handler, setHandler] = useState<(() => void) | undefined>(undefined);
  const register = useCallback((next: (() => void) | undefined) => {
    setHandler(next ? () => next : undefined);
  }, []);
  return (
    <LogoLongPressRegisterContext.Provider value={register}>
      <LogoLongPressContext.Provider value={handler}>{children}</LogoLongPressContext.Provider>
    </LogoLongPressRegisterContext.Provider>
  );
}
