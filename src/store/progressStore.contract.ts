import { describe, expect, it } from 'vitest';
import type { Learner } from '@/engine/types';
import type { ProgressStore } from '@/store/ProgressStore';

function learner(id: string, nickname: string, createdAt: string): Learner {
  return { id, nickname, createdAt };
}

export function runProgressStoreContract(name: string, create: () => Promise<ProgressStore>): void {
  describe(`ProgressStore contract: ${name}`, () => {
    it('เพิ่มและอ่านผู้เรียน, id ซ้ำไม่เขียนทับ, คืนจำนวนที่เพิ่มจริง', async () => {
      const store = await create();
      const added1 = await store.addLearners([learner('l1', 'หนูดี', '2026-01-01T00:00:00.000Z')]);
      expect(added1).toBe(1);
      const added2 = await store.addLearners([
        learner('l1', 'ชื่อใหม่', '2026-01-01T00:00:00.000Z'),
      ]);
      expect(added2).toBe(0);
      const learners = await store.listLearners();
      expect(learners).toHaveLength(1);
      expect(learners[0]?.nickname).toBe('หนูดี');
      await store.close();
    });

    it('เรียงผู้เรียนตาม createdAt แล้ว id', async () => {
      const store = await create();
      await store.addLearners([
        learner('b', 'บี', '2026-01-02T00:00:00.000Z'),
        learner('a', 'เอ', '2026-01-01T00:00:00.000Z'),
      ]);
      const learners = await store.listLearners();
      expect(learners.map((l) => l.id)).toEqual(['a', 'b']);
      await store.close();
    });

    it('append event แล้วอ่านได้ครบ, id ซ้ำถูกข้าม', async () => {
      const store = await create();
      const event = {
        id: 'e1',
        at: '2026-01-01T00:00:00.000Z',
        schemaVersion: 1 as const,
        learnerId: 'l1',
        sessionId: 's1',
        activityId: 'DX-ADD',
        type: 'session.started' as const,
      };
      const added1 = await store.appendEvents([event]);
      expect(added1).toBe(1);
      const added2 = await store.appendEvents([event]);
      expect(added2).toBe(0);
      const events = await store.listEvents();
      expect(events).toHaveLength(1);
      await store.close();
    });

    it('เรียง event ตาม at แล้ว id แม้เขียนสลับลำดับ', async () => {
      const store = await create();
      const makeEvent = (id: string, at: string) => ({
        id,
        at,
        schemaVersion: 1 as const,
        learnerId: 'l1',
        sessionId: 's1',
        activityId: 'DX-ADD',
        type: 'session.started' as const,
      });
      await store.appendEvents([
        makeEvent('e2', '2026-01-01T00:00:02.000Z'),
        makeEvent('e1', '2026-01-01T00:00:01.000Z'),
      ]);
      const events = await store.listEvents();
      expect(events.map((e) => e.id)).toEqual(['e1', 'e2']);
      await store.close();
    });

    it('กรองด้วย learnerId, activityId, sessionId และรวมกัน', async () => {
      const store = await create();
      const base = {
        at: '2026-01-01T00:00:00.000Z',
        schemaVersion: 1 as const,
        type: 'session.started' as const,
      };
      await store.appendEvents([
        { ...base, id: 'e1', learnerId: 'l1', sessionId: 's1', activityId: 'DX-ADD' },
        { ...base, id: 'e2', learnerId: 'l2', sessionId: 's1', activityId: 'DX-ADD' },
        { ...base, id: 'e3', learnerId: 'l1', sessionId: 's2', activityId: 'ADD-01' },
      ]);
      expect((await store.listEvents({ learnerId: 'l1' })).map((e) => e.id).sort()).toEqual([
        'e1',
        'e3',
      ]);
      expect((await store.listEvents({ activityId: 'DX-ADD' })).map((e) => e.id).sort()).toEqual([
        'e1',
        'e2',
      ]);
      expect((await store.listEvents({ sessionId: 's2' })).map((e) => e.id)).toEqual(['e3']);
      expect(
        (await store.listEvents({ learnerId: 'l1', activityId: 'DX-ADD' })).map((e) => e.id),
      ).toEqual(['e1']);
      await store.close();
    });

    it('ค่าที่คืนเป็นสำเนา แก้ไขไม่กระทบข้อมูลใน store', async () => {
      const store = await create();
      await store.addLearners([learner('l1', 'หนูดี', '2026-01-01T00:00:00.000Z')]);
      const learners = await store.listLearners();
      // @ts-expect-error -- ทดสอบว่าแก้ object ที่ได้ไม่กระทบ store
      learners[0].nickname = 'แก้แล้ว';
      const learnersAgain = await store.listLearners();
      expect(learnersAgain[0]?.nickname).toBe('หนูดี');
      await store.close();
    });

    it('meta เขียน/อ่าน/ไม่มีค่า', async () => {
      const store = await create();
      expect(await store.getMeta('currentLearnerId')).toBeUndefined();
      await store.setMeta('currentLearnerId', 'l1');
      expect(await store.getMeta('currentLearnerId')).toBe('l1');
      await store.close();
    });
  });
}
