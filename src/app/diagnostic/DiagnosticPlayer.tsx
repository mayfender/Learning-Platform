import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useRegisterLogoLongPress } from '@/app/LayoutContext';
import { useProgress } from '@/app/ProgressProvider';
import { formatText } from '@/app/diagnostic/formatText';
import { useDiagnosticRunner } from '@/app/diagnostic/useDiagnosticRunner';
import { useSilentTimer } from '@/app/diagnostic/useSilentTimer';
import { formatProblem } from '@/engine/problem';
import type { Diagnostic } from '@/engine/types';
import { TenFrame } from '@/manipulatives/TenFrame';
import { AnswerDisplay } from '@/ui/AnswerDisplay';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Keypad } from '@/ui/Keypad';
import { OptionGrid } from '@/ui/OptionGrid';
import styles from '@/app/diagnostic/DiagnosticPlayer.module.css';

const TAP_GUARD_MS = 400;

export interface DiagnosticPlayerProps {
  dx: Diagnostic;
}

export function DiagnosticPlayer({ dx }: DiagnosticPlayerProps) {
  const { currentLearner, outbox } = useProgress();
  const navigate = useNavigate();
  const { state, dispatch, sessionId } = useDiagnosticRunner(dx, {
    learnerId: currentLearner?.id ?? '',
    outbox,
  });
  const [stopOpen, setStopOpen] = useState(false);
  const [value, setValue] = useState('');
  // เวลา (performance.now) ของการแตะล่าสุดที่ทำให้เปลี่ยนหน้าจอของลูก — ดู Tech Spec §3.3.1
  const lastTransitionAt = useRef(-Infinity);

  const phase = state.phase;
  const itemKey = phase.kind === 'item' ? `${phase.stage}-${phase.item}` : '';
  const step = phase.kind === 'item' ? phase.step : 'ready';
  const timer = useSilentTimer(itemKey, step);

  useEffect(() => {
    setValue('');
  }, [itemKey]);

  // กันแตะทะลุหลังเปลี่ยนหน้า (§3.3.1): input ทั้ง pointer และคีย์บอร์ดที่เข้ามาภายใน 400 ms หลังการแตะที่
  // เปลี่ยนหน้า ถูกทิ้งไม่ว่าตำแหน่งใด ไม่ disable ปุ่ม ไม่ใช้ setTimeout (เทียบเวลาตอน input เข้ามา)
  function withinTapGuard(): boolean {
    const elapsed = performance.now() - lastTransitionAt.current;
    return elapsed >= 0 && elapsed < TAP_GUARD_MS;
  }

  // ทุก action ที่เกิดจากการแตะและเปลี่ยนหน้าของลูก ต้องผ่านฟังก์ชันนี้
  function tapDispatch(action: Parameters<typeof dispatch>[0]): void {
    lastTransitionAt.current = performance.now();
    dispatch(action);
  }

  function guardPointer(e: React.MouseEvent): void {
    // ปุ่มของพ่อ (กล่องยืนยันหยุดกลางทาง) ไม่อยู่ใต้กฎนี้
    if ((e.target as HTMLElement).closest('dialog')) return;
    if (withinTapGuard()) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  const withinTapGuardRef = useRef(withinTapGuard);
  useEffect(() => {
    withinTapGuardRef.current = withinTapGuard;
  });
  useEffect(() => {
    // capture บน window ทำงานก่อนตัวฟังของแป้น (bubble) จึงตัดได้ก่อน
    const listener = (e: KeyboardEvent): void => {
      if (!withinTapGuardRef.current()) return;
      if (
        e.key === 'Backspace' ||
        e.key === 'Enter' ||
        (e.key.length === 1 && e.key >= '0' && e.key <= '9')
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', listener, true);
    return () => window.removeEventListener('keydown', listener, true);
  }, []);

  const registerLogo = useRegisterLogoLongPress();
  const longPressRef = useRef<() => void>(() => {});

  function onLogoLongPress(): void {
    if (phase.kind === 'item' && phase.step === 'answering') {
      timer.invalidate();
    }
    setStopOpen(true);
  }

  useEffect(() => {
    longPressRef.current = onLogoLongPress;
  });

  useEffect(() => {
    registerLogo(() => longPressRef.current());
    return () => registerLogo(undefined);
  }, [registerLogo]);

  function onSubmit(): void {
    if (phase.kind !== 'item' || phase.step !== 'answering' || value.length === 0) return;
    const result = timer.submit();
    tapDispatch({
      type: 'SUBMIT',
      response: Number(value),
      latencyMs: result.latencyMs,
      latencyValid: result.latencyValid,
      flashInterrupted: result.flashInterrupted,
    });
  }

  let content: React.ReactNode;

  if (phase.kind === 'parent-intro') {
    content = (
      <div>
        <h1>{dx.texts.parentIntro.title}</h1>
        <p>{dx.texts.parentIntro.description}</p>
        <ul className={styles.bullets}>
          {dx.texts.parentIntro.bullets.map((b, i) => (
            <li key={i}>
              {b.strong && <strong>{b.strong}</strong>}
              {b.text}
            </li>
          ))}
        </ul>
        <Button onClick={() => tapDispatch({ type: 'PARENT_CONTINUE' })}>
          {dx.texts.parentIntro.button}
        </Button>
      </div>
    );
  } else if (phase.kind === 'kid-intro') {
    content = (
      <div>
        <h1>{dx.texts.kidIntro.title}</h1>
        <p>{dx.texts.kidIntro.lines[0]}</p>
        <p>{dx.texts.kidIntro.lines[1]}</p>
        <Button onClick={() => tapDispatch({ type: 'KID_START' })}>
          {dx.texts.kidIntro.button}
        </Button>
      </div>
    );
  } else if (phase.kind === 'stage-intro') {
    const stage = dx.stages[phase.stage]!;
    content = (
      <div>
        {phase.completed && (
          <p className={styles.centerText}>
            {formatText(dx.texts.stageComplete, { n: phase.completed.n, m: phase.completed.m })}
          </p>
        )}
        <p>{stage.intro}</p>
        <Button onClick={() => tapDispatch({ type: 'STAGE_GO' })}>{dx.texts.stageGo}</Button>
      </div>
    );
  } else if (phase.kind === 'item') {
    const stage = dx.stages[phase.stage]!;
    const item = stage.items[phase.item]!;
    const isFlash = item.visual?.mode === 'flash';

    let visual: React.ReactNode;
    let stepText: string;
    if (isFlash) {
      const flash = item.visual!;
      const count = item.problem.kind === 'subitize' ? item.problem.count : 0;
      if (phase.step === 'ready') {
        stepText = dx.texts.flash.ready;
        visual = <TenFrame key={item.id} mode="hidden" filled={count} />;
      } else if (phase.step === 'show') {
        stepText = dx.texts.flash.show;
        visual = (
          <TenFrame
            key={`${item.id}-flash`}
            mode="flash"
            flashMs={flash.flashMs}
            colorMode={flash.colorMode}
            filled={count}
            onFlashEnd={() => dispatch({ type: 'FLASH_END' })}
          />
        );
      } else {
        stepText = dx.texts.flash.hidden;
        visual = <TenFrame key={item.id} mode="hidden" filled={count} />;
      }
    } else {
      stepText = formatProblem(item.problem);
      visual = null;
    }

    const answering = phase.step === 'answering';

    content = (
      <div className={styles.itemLayout}>
        <div>
          {isFlash ? (
            <>
              <p className={styles.centerText}>{stepText}</p>
              <div className={styles.visualWrap}>{visual}</div>
            </>
          ) : (
            <p className={styles.problem}>{stepText}</p>
          )}
          <p className={styles.instruction}>{stage.instruction}</p>
        </div>
        <div>
          <AnswerDisplay value={value} placeholder={dx.texts.answerPlaceholder} />
          <Keypad
            value={value}
            onChange={setValue}
            onSubmit={onSubmit}
            submitLabel={dx.texts.submit}
            disabled={!answering || stopOpen}
          />
        </div>
      </div>
    );
  } else if (phase.kind === 'ack') {
    content = <p className={styles.centerText}>{phase.text}</p>;
  } else if (phase.kind === 'strategy') {
    const stage = dx.stages[phase.stage]!;
    const item = stage.items[phase.item]!;
    const set = dx.strategySets.find((s) => s.id === item.strategySetId);
    content = (
      <div>
        <p className={styles.centerText}>{dx.texts.strategyQuestion}</p>
        <OptionGrid
          options={(set?.options ?? []).map((o) => ({
            id: o.id,
            label: o.label,
            example: o.example?.text,
          }))}
          onPick={(id) => tapDispatch({ type: 'STRATEGY_PICK', strategyId: id as never })}
        />
      </div>
    );
  } else if (phase.kind === 'kid-end') {
    content = (
      <div>
        <h1>{dx.texts.kidEnd.title}</h1>
        <p>{dx.texts.kidEnd.text}</p>
        <Button onClick={() => void navigate(`/parent/results/${sessionId}`)}>
          {dx.texts.kidEnd.button}
        </Button>
      </div>
    );
  } else {
    content = null;
  }

  return (
    <div className={styles.wrap} onClickCapture={guardPointer}>
      {content}
      <ConfirmDialog
        open={stopOpen}
        title={dx.texts.stop.title}
        body={dx.texts.stop.body}
        confirmLabel={dx.texts.stop.confirmLabel}
        cancelLabel={dx.texts.stop.cancelLabel}
        onConfirm={() => {
          setStopOpen(false);
          dispatch({ type: 'STOP' });
        }}
        onCancel={() => setStopOpen(false)}
      />
    </div>
  );
}
