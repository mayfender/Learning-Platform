import type { Diagnostic } from '@/engine/types';
import type { Lesson } from '@/engine/lesson/types';
import { DX_ADD } from '@/content/diagnostics/DX-ADD';
import { ADD_04 } from '@/content/lessons/ADD-04';

export const diagnostics: Record<string, Diagnostic> = {
  'DX-ADD': DX_ADD,
};

export const lessons: Record<string, Lesson> = {
  'ADD-04': ADD_04,
};

// รวมกิจกรรมทุกชนิดสำหรับการ์ดหน้าหลัก (Tech Spec §4.2)
export const activities: Record<string, Diagnostic | Lesson> = {
  ...diagnostics,
  ...lessons,
};
