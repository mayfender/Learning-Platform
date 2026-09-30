// ข้อความหน้านี้ไม่ได้อยู่ใน strings.ts โดยตั้งใจ: หน้านี้เป็น dev-only (โหลดเฉพาะ import.meta.env.DEV
// ผ่าน React.lazy — AC8) การอ้าง strings.ts ที่ใช้ร่วมกับหน้าอื่นจะทำให้ข้อความนี้ติดไปกับ
// production bundle แม้ตัว component จะถูกตัดออกก็ตาม
import { useState } from 'react';
import { NumberBond, type BondSlot } from '@/manipulatives/NumberBond';
import { TenFrame } from '@/manipulatives/TenFrame';
import { FieldGroup, type FieldDef, type FieldId } from '@/ui/FieldGroup';
import { allFieldsFilled } from '@/ui/fieldGroupUtils';
import { Keypad } from '@/ui/Keypad';

const FIELDS: readonly FieldDef[] = [
  { id: 'gap', label: 'ขาด' },
  { id: 'rest', label: 'เหลือ' },
  { id: 'total', label: 'ทั้งหมด' },
];

function countDots(el: Element | null): number {
  return el ? el.querySelectorAll('[data-dot]').length : 0;
}

/** A1: แตะช่องว่างเพื่อเติม + NumberBond นับตามที่แตะ */
function FillDemo() {
  const [start, setStart] = useState(8);
  const [added, setAdded] = useState<number[]>([]);
  const [ring, setRing] = useState<number[]>([]);
  const k = added.length;
  const mid: BondSlot = k === 0 ? '?' : k;
  return (
    <section data-demo="fill">
      <h3>แตะช่องว่างเพื่อเติม (interactive)</h3>
      <p>
        จุดตั้งต้น:{' '}
        {[3, 6, 8].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setStart(n);
              setAdded([]);
              setRing([]);
            }}
          >
            {n}
          </button>
        ))}
      </p>
      <TenFrame
        mode="show"
        size="md"
        interactive
        filled={start}
        added={added}
        highlight={{ indices: ring, pulse: true }}
        onCellTap={(i, state) => {
          if (state === 'empty') setAdded((a) => [...a, i]);
        }}
      />
      <NumberBond mode="show" size="sm" whole={10} parts={[start, mid]} />
      <p data-testid="fill-status">
        เติม {k} ช่อง / เห็นจุด {start + k}
      </p>
      <button type="button" onClick={() => setRing(added)}>
        ไฮไลต์ช่องที่เติม
      </button>{' '}
      <button type="button" onClick={() => setRing([])}>
        ล้างไฮไลต์
      </button>
    </section>
  );
}

function BondDemo() {
  const states: { name: string; whole: BondSlot; parts: readonly [BondSlot, BondSlot] }[] = [
    { name: 'ยังไม่ปรากฏ (null)', whole: null, parts: [8, null] },
    { name: 'ว่างวงประ (?)', whole: 10, parts: [8, '?'] },
    { name: 'ครบ', whole: 10, parts: [8, 2] },
    { name: 'B1: ย้าย / เหลือ ?', whole: 8, parts: [2, '?'] },
  ];
  const [step, setStep] = useState<BondSlot>(null);
  return (
    <section>
      <h3>NumberBond</h3>
      {states.map((s) => (
        <div key={s.name}>
          <p>{s.name}</p>
          <NumberBond mode="show" size="sm" whole={s.whole} parts={s.parts} />
        </div>
      ))}
      <p>ไฮไลต์</p>
      {(['whole', 'part-a', 'part-b'] as const).map((h) => (
        <NumberBond key={h} mode="show" size="sm" whole={10} parts={[8, 2]} highlight={h} />
      ))}
      <p>ขึ้นทีละตัว (fade 200ms)</p>
      <button
        type="button"
        onClick={() => setStep((s) => (s === null ? '?' : s === '?' ? 2 : null))}
      >
        ถัดไป
      </button>
      <NumberBond mode="show" size="sm" whole={10} parts={[8, step]} />
      <p>hidden</p>
      <NumberBond mode="hidden" size="sm" whole={10} parts={[8, 2]} />
    </section>
  );
}

function FieldDemo() {
  const [values, setValues] = useState<Partial<Record<FieldId, string>>>({});
  const [focusId, setFocusId] = useState<FieldId>('gap');
  const [sent, setSent] = useState('');
  return (
    <section>
      <h3>FieldGroup + Keypad</h3>
      <FieldGroup fields={FIELDS} values={values} focusId={focusId} onFocus={setFocusId} />
      <Keypad
        value={values[focusId] ?? ''}
        onChange={(v) => setValues((old) => ({ ...old, [focusId]: v }))}
        onSubmit={() => {
          if (allFieldsFilled(FIELDS, values)) setSent(JSON.stringify(values));
        }}
        submitLabel="ตอบ"
      />
      <p>ส่งแล้ว: {sent || '-'} (ปุ่มตอบต้องกรอกครบ 3 ช่องก่อน)</p>
    </section>
  );
}

export function DevManipulatives() {
  const [flashKey, setFlashKey] = useState(0);
  const [ended, setEnded] = useState(false);
  const [addedFlashKey, setAddedFlashKey] = useState(0);
  const [addedFlashDots, setAddedFlashDots] = useState<number | null>(null);
  const [dotsNow, setDotsNow] = useState<number | null>(null);

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <h1>ห้องเครื่องมือ</h1>
      <h2>TenFrame</h2>
      {(['single', 'split-5'] as const).map((colorMode) => (
        <section key={colorMode}>
          <h3>{colorMode}</h3>
          <p>show</p>
          <TenFrame mode="show" filled={7} colorMode={colorMode} size="sm" />
          <p>hidden</p>
          <TenFrame mode="hidden" filled={7} colorMode={colorMode} size="sm" />
        </section>
      ))}
      <h3>flash</h3>
      <button
        type="button"
        onClick={() => {
          setEnded(false);
          setFlashKey((k) => k + 1);
        }}
      >
        แฟลช 1.5 วิ
      </button>
      {flashKey > 0 && (
        <TenFrame
          key={flashKey}
          mode="flash"
          flashMs={1500}
          filled={7}
          colorMode="single"
          size="sm"
          onFlashEnd={() => setEnded(true)}
        />
      )}
      {ended && <p>จบแฟลช</p>}

      <h2>TenFrame v2</h2>
      <h3>added (ช่อง 8, 9 เติมแล้ว) และ highlight</h3>
      <div data-demo="added">
        <TenFrame mode="show" filled={8} added={[8, 9]} highlight={{ indices: [8, 9] }} size="md" />
      </div>
      <h3>highlight pulse (กะพริบ; reduced motion = คงที่)</h3>
      <TenFrame
        mode="show"
        filled={6}
        highlight={{ indices: [6, 7, 8, 9], pulse: true }}
        size="md"
      />
      <FillDemo />
      <h3>แฟลชกล่อง + จุดเติม (1.5 วิ) แล้วนับจุด</h3>
      <button
        type="button"
        onClick={() => {
          setAddedFlashDots(null);
          setDotsNow(null);
          setAddedFlashKey((k) => k + 1);
        }}
      >
        แฟลช 6 + เติม 3
      </button>
      {addedFlashKey > 0 && (
        <div
          ref={(el) => {
            if (el && addedFlashDots === null) setDotsNow(countDots(el));
          }}
        >
          <TenFrame
            key={addedFlashKey}
            mode="flash"
            flashMs={1500}
            filled={6}
            added={[6, 7, 8]}
            size="md"
            onFlashEnd={() => setAddedFlashDots(0)}
          />
        </div>
      )}
      <p>
        จุดที่เห็นตอนเริ่มแฟลช: {dotsNow ?? '-'} / หลังซ่อน: {addedFlashDots ?? '-'}
      </p>

      <BondDemo />
      <FieldDemo />
    </div>
  );
}

export default DevManipulatives;
