import { describe, expect, it } from 'vitest';
import type { AnsweredPayload } from '@/engine/lesson/evaluate';
import { roundSummary } from '@/engine/lesson/roundSummary';
import { lesson } from '@/engine/lesson/testHarness';

const texts = lesson.texts.roundEnd;

function round(items: [boolean, number, boolean?][]): AnsweredPayload[] {
  return items.map(([correct, ms, valid], i) => ({
    type: 'item.answered',
    itemId: `p${i + 1}`,
    skillId: 'add.bonds-10',
    problem: { kind: 'missing-part', whole: 10, part: 7 },
    expected: 3,
    response: correct ? 3 : 4,
    correct,
    latencyMs: ms,
    latencyValid: valid ?? true,
    fluent: null,
    attemptNo: 1,
  }));
}

describe('roundSummary (LS §6.3)', () => {
  it('ไม่มีรอบก่อน → "วันนี้ทำครบ {n} ข้อ" (ไม่ชี้ว่าช้า)', () => {
    expect(
      roundSummary(
        round([
          [true, 3000],
          [true, 4000],
          [true, 5000],
          [true, 6000],
        ]),
        undefined,
        texts,
      ),
    ).toBe('วันนี้ทำครบ 4 ข้อ');
  });

  it('เร็วกว่าค่าเฉลี่ยของข้อถูกในรอบก่อน k ข้อ → "วันนี้เร็วกว่าครั้งก่อน {k} ข้อ"', () => {
    const prev = round([
      [true, 4000],
      [true, 6000],
      [false, 100],
      [true, 5000],
    ]); // เฉลี่ยข้อถูก = 5000
    const cur = round([
      [true, 4999],
      [true, 3000],
      [true, 5000],
      [true, 9000],
    ]); // เร็วกว่า: 4999, 3000
    expect(roundSummary(cur, prev, texts)).toBe('วันนี้เร็วกว่าครั้งก่อน 2 ข้อ');
  });

  it('ข้อที่ผิดไม่นับแม้เร็ว; เท่ากับค่าเฉลี่ยพอดีไม่นับ', () => {
    const prev = round([
      [true, 5000],
      [true, 5000],
      [true, 5000],
      [true, 5000],
    ]);
    expect(
      roundSummary(
        round([
          [false, 10],
          [true, 5000],
          [true, 5001],
          [true, 9000],
        ]),
        prev,
        texts,
      ),
    ).toBe('วันนี้ทำครบ 4 ข้อ');
    expect(
      roundSummary(
        round([
          [false, 10],
          [true, 4999],
          [true, 5001],
          [true, 9000],
        ]),
        prev,
        texts,
      ),
    ).toBe('วันนี้เร็วกว่าครั้งก่อน 1 ข้อ');
  });

  it('ข้อที่ latencyValid=false ไม่นับทั้งฝั่งรอบนี้และรอบก่อน', () => {
    const prev = round([
      [true, 100000, false],
      [true, 5000],
      [true, 5000],
      [true, 5000],
    ]);
    const cur = round([
      [true, 1, false],
      [true, 6000],
      [true, 6000],
      [true, 6000],
    ]);
    expect(roundSummary(cur, prev, texts)).toBe('วันนี้ทำครบ 4 ข้อ');
    expect(
      roundSummary(
        round([
          [true, 1, false],
          [true, 4000],
          [true, 6000],
          [true, 6000],
        ]),
        prev,
        texts,
      ),
    ).toBe('วันนี้เร็วกว่าครั้งก่อน 1 ข้อ');
  });

  it('รอบก่อนไม่มีข้อถูกที่ใช้ได้ → ทำครบ n ข้อ', () => {
    const prev = round([
      [false, 1000],
      [false, 1000],
      [true, 1000, false],
      [false, 1000],
    ]);
    expect(
      roundSummary(
        round([
          [true, 1],
          [true, 1],
          [true, 1],
          [true, 1],
        ]),
        prev,
        texts,
      ),
    ).toBe('วันนี้ทำครบ 4 ข้อ');
  });

  it('ข้อความไม่มีเวลา คะแนน หรือคำว่าช้า', () => {
    const prev = round([
      [true, 5000],
      [true, 5000],
      [true, 5000],
      [true, 5000],
    ]);
    for (const cur of [
      round([
        [true, 1],
        [true, 1],
        [true, 1],
        [true, 1],
      ]),
      round([
        [true, 9999],
        [true, 9999],
        [true, 9999],
        [true, 9999],
      ]),
    ]) {
      const t = roundSummary(cur, prev, texts);
      expect(t).not.toMatch(/ช้า|คะแนน|วินาที|ms/);
    }
  });
});
