// Props กลางของอุปกรณ์จำลองทุกชิ้น (ADR-0005 ตามตัวอักษร)
export interface ManipulativeBaseProps {
  mode: 'show' | 'flash' | 'hidden';
  flashMs?: number;
  onFlashEnd?: () => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}
