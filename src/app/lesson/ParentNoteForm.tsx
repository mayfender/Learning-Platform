import { useState } from 'react';
import type { LessonTexts } from '@/engine/lesson/types';
import type { NoteFrequency } from '@/engine/types';
import { Button } from '@/ui/Button';
import styles from '@/app/lesson/ParentNoteForm.module.css';

export interface ParentNoteFormProps {
  texts: LessonTexts['parentNote'];
  /** หัวข้อของส่วนที่บันทึก (เช่น "ส่วน A") */
  partLabel: string;
  onSave: (value: { fingers: NoteFrequency; mouth: NoteFrequency; note?: string }) => void;
  /** ถ้าส่งมา จะมีปุ่ม "ข้าม" (หน้าปลายครั้ง) ไม่ส่ง = ใช้ในหน้าพ่อของบท */
  onSkip?: () => void;
}

const MAX_NOTE_LENGTH = 200;
const FREQUENCIES: readonly NoteFrequency[] = ['none', 'some', 'most'];

interface ChoiceGroupProps {
  label: string;
  name: string;
  value: NoteFrequency | '';
  options: LessonTexts['parentNote']['options'];
  onChange: (v: NoteFrequency) => void;
}

function ChoiceGroup({ label, name, value, options, onChange }: ChoiceGroupProps) {
  return (
    <div className={styles.group}>
      <span className={styles.groupLabel}>{label}</span>
      <div role="radiogroup" aria-label={label} className={styles.options}>
        {FREQUENCIES.map((f) => (
          <label key={f} className={`${styles.option} ${value === f ? styles.selected : ''}`}>
            <input
              type="radio"
              name={name}
              className={styles.radio}
              checked={value === f}
              onChange={() => onChange(f)}
            />
            {options[f]}
          </label>
        ))}
      </div>
    </div>
  );
}

// ฟอร์ม "บันทึกสำหรับพ่อ" (Tech Spec §5.7, P8): ใช้นิ้ว / ขยับปากนับ + โน้ตสั้น (≤ 200 ตัวอักษร)
export function ParentNoteForm({ texts, partLabel, onSave, onSkip }: ParentNoteFormProps) {
  const [fingers, setFingers] = useState<NoteFrequency | ''>('');
  const [mouth, setMouth] = useState<NoteFrequency | ''>('');
  const [note, setNote] = useState('');
  const ready = fingers !== '' && mouth !== '';

  function save(): void {
    if (fingers === '' || mouth === '') return;
    const trimmed = note.trim();
    onSave({ fingers, mouth, ...(trimmed ? { note: trimmed } : {}) });
    setFingers('');
    setMouth('');
    setNote('');
  }

  return (
    <div className={styles.form}>
      <h2>{texts.title}</h2>
      <p className={styles.part}>{partLabel}</p>
      <ChoiceGroup
        label={texts.fingers}
        name="note-fingers"
        value={fingers}
        options={texts.options}
        onChange={setFingers}
      />
      <ChoiceGroup
        label={texts.mouth}
        name="note-mouth"
        value={mouth}
        options={texts.options}
        onChange={setMouth}
      />
      <label className={styles.noteLabel}>
        {texts.note}
        <textarea
          className={styles.textarea}
          rows={3}
          maxLength={MAX_NOTE_LENGTH}
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
        />
      </label>
      <div className={styles.actions}>
        <Button type="button" disabled={!ready} onClick={save}>
          {texts.save}
        </Button>
        {onSkip && (
          <Button type="button" variant="secondary" onClick={onSkip}>
            {texts.skip}
          </Button>
        )}
      </div>
    </div>
  );
}
