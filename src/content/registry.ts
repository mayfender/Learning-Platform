import type { Diagnostic } from '@/engine/types';
import { DX_ADD } from '@/content/diagnostics/DX-ADD';

export const diagnostics: Record<string, Diagnostic> = {
  'DX-ADD': DX_ADD,
};

export const lessons = {};
