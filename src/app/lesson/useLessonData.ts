import { useCallback, useEffect, useState } from 'react';
import { useProgress } from '@/app/ProgressProvider';
import { loadLessonEvents } from '@/app/lesson/loadLessonEvents';
import { skills } from '@/content/skills';
import { deriveProgress, type LessonProgress } from '@/engine/lesson/progress';
import type { Lesson } from '@/engine/lesson/types';
import type { AppEvent } from '@/engine/types';

export interface LessonData {
  events: readonly AppEvent[];
  progress: LessonProgress;
}

// โหลด event ของบทและคำนวณความก้าวหน้า (ไม่เก็บเป็นสถานะ ADR-0003) โหลดใหม่เมื่อ outbox เปลี่ยน
// undefined = ยังโหลดไม่เสร็จ
export function useLessonData(lesson: Lesson): LessonData | undefined {
  const { store, outbox, currentLearner } = useProgress();
  const learnerId = currentLearner?.id;
  const [data, setData] = useState<LessonData | undefined>(undefined);

  const load = useCallback(async (): Promise<LessonData | undefined> => {
    if (!learnerId) return undefined;
    const events = await loadLessonEvents(store, outbox, learnerId, lesson.id);
    return { events, progress: deriveProgress(lesson, skills, events) };
  }, [store, outbox, learnerId, lesson]);

  useEffect(() => {
    let cancelled = false;
    const run = (): void => {
      void load().then((d) => {
        if (!cancelled) setData(d);
      });
    };
    run();
    const unsubscribe = outbox.subscribe(run);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [load, outbox]);

  return data;
}
