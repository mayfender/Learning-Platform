import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useRegisterLogoLongPress } from '@/app/LayoutContext';
import { useProgress } from '@/app/ProgressProvider';
import { useSilentTimer, type PhaseStep } from '@/app/diagnostic/useSilentTimer';
import { ParentNoteForm } from '@/app/lesson/ParentNoteForm';
import { lessonStrings } from '@/app/lesson/lessonStrings';
import { loadLessonEvents } from '@/app/lesson/loadLessonEvents';
import { useActivityRunner } from '@/app/useActivityRunner';
import { useTapGuard } from '@/app/useTapGuard';
import { skills } from '@/content/skills';
import { fill, nOf } from '@/engine/lesson/feedback';
import {
  createLessonMachine,
  type ItemView,
  type LessonAction,
  type LessonRunnerState,
} from '@/engine/lesson/machine';
import { planSitting, type SittingPlan } from '@/engine/lesson/plan';
import { deriveProgress } from '@/engine/lesson/progress';
import type { Lesson, LessonItem } from '@/engine/lesson/types';
import { formatProblem } from '@/engine/problem';
import { createSilentTimer } from '@/engine/timing';
import type { BlockKind, StrategyId } from '@/engine/types';
import { NumberBond } from '@/manipulatives/NumberBond';
import { TenFrame } from '@/manipulatives/TenFrame';
import { newId } from '@/store/ids';
import { AnswerDisplay } from '@/ui/AnswerDisplay';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Keypad } from '@/ui/Keypad';
import { OptionGrid } from '@/ui/OptionGrid';
import styles from '@/app/lesson/LessonPlayer.module.css';

// รอบที่ 1 ของ ADD-04 เล่นได้เฉพาะเช็คก่อนและส่วน A (Tech Spec §10 T6) ส่วน B / ฝึก / ท้าทาย รอรอบที่ 2
const PLAYABLE_BLOCKS: ReadonlySet<BlockKind> = new Set<BlockKind>(['check', 'A']);
const SKIPPABLE_BLOCKS: ReadonlySet<BlockKind> = new Set<BlockKind>([
  'A',
  'B',
  'challenge',
  'practice',
]);

function restrictPlan(plan: SittingPlan): SittingPlan {
  return {
    ...plan,
    queue: plan.queue.filter((q) => q.type === 'instruction' || PLAYABLE_BLOCKS.has(q.slot.kind)),
  };
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}

export interface LessonPlayerProps {
  lesson: Lesson;
}

// ตัวนอก: โหลด event เดิมของบท คำนวณความก้าวหน้าและแผนของครั้งนี้ แล้วจึงเริ่มตัวเล่น
export function LessonPlayer({ lesson }: LessonPlayerProps) {
  const { store, outbox, currentLearner } = useProgress();
  const learnerId = currentLearner?.id;
  const [plan, setPlan] = useState<SittingPlan | undefined>(undefined);

  useEffect(() => {
    if (!learnerId) return;
    let cancelled = false;
    void loadLessonEvents(store, outbox, learnerId, lesson.id).then((events) => {
      if (cancelled) return;
      const progress = deriveProgress(lesson, skills, events);
      const planned = planSitting({ lesson, skills }, progress, { seed: randomSeed() });
      setPlan(restrictPlan(planned));
    });
    return () => {
      cancelled = true;
    };
  }, [store, outbox, learnerId, lesson]);

  if (!learnerId || !plan) return null;

  // ไม่มีส่วนที่เล่นได้ในรอบนี้ (เช่น ครั้งที่ 2 ที่เหลือแต่ส่วน B) ไม่เริ่ม session และไม่บันทึกอะไร
  if (!plan.queue.some((q) => q.type === 'block')) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>{lesson.title}</h1>
        <p className={styles.centerText}>{lessonStrings.notYetOpen}</p>
        <div className={styles.actions}>
          <Link to="/">{lessonStrings.backHome}</Link>
        </div>
      </div>
    );
  }

  return <LessonSession lesson={lesson} plan={plan} learnerId={learnerId} />;
}

interface LessonSessionProps {
  lesson: Lesson;
  plan: SittingPlan;
  learnerId: string;
}

function stageToTimerStep(state: LessonRunnerState): PhaseStep {
  const phase = state.phase;
  if (phase.kind !== 'item') return 'ready';
  switch (phase.view.stage) {
    case 'answering':
      return 'answering';
    case 'show':
      return 'show';
    default:
      return 'ready';
  }
}

function LessonSession({ lesson, plan, learnerId }: LessonSessionProps) {
  const { outbox } = useProgress();
  const navigate = useNavigate();
  const texts = lesson.texts;
  const machine = useMemo(
    () => createLessonMachine(lesson, plan, { skills, newId }),
    [lesson, plan],
  );
  const { state, dispatch } = useActivityRunner(machine, {
    learnerId,
    outbox,
    activityId: lesson.id,
    syncRender: true,
  });
  const [stopOpen, setStopOpen] = useState(false);
  const [value, setValue] = useState('');
  // กันแตะทะลุหลังเปลี่ยนหน้า (Tech Spec §3.4/§3.5) ใช้ hook เดียวกับ DiagnosticPlayer
  const { tapDispatch: guardedDispatch, guardPointer } = useTapGuard();
  function tapDispatch(action: LessonAction): void {
    guardedDispatch(dispatch, action);
  }

  const phase = state.phase;
  const itemKey =
    phase.kind === 'item' ? `${state.blocksStarted}-${phase.stepIdx}-${phase.item.id}` : '';
  const timer = useSilentTimer(itemKey, stageToTimerStep(state));

  useEffect(() => {
    setValue('');
  }, [itemKey]);

  // ตัวจับเวลาเงียบของหน้า "ในหัวเห็นอะไร" (เหมือน DiagnosticPlayer) ถ้าแท็บถูกซ่อนไม่ใส่ strategyLatencyMs
  const strategyTimerRef = useRef(createSilentTimer());
  const mindKey = phase.kind === 'item' && phase.view.stage === 'mind' ? itemKey : '';
  useEffect(() => {
    if (mindKey === '') return;
    strategyTimerRef.current.start();
    if (document.visibilityState === 'hidden') strategyTimerRef.current.invalidate();
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') strategyTimerRef.current.invalidate();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [mindKey]);

  // กดค้างโลโก้ (พ่อ): กล่องหยุด / ข้ามส่วนนี้
  const registerLogo = useRegisterLogoLongPress();
  const longPressRef = useRef<() => void>(() => {});
  useEffect(() => {
    longPressRef.current = () => {
      if (phase.kind === 'item' && phase.view.stage === 'answering') timer.invalidate();
      setStopOpen(true);
    };
  });
  useEffect(() => {
    registerLogo(() => longPressRef.current());
    return () => registerLogo(undefined);
  }, [registerLogo]);

  useEffect(() => {
    if (phase.kind === 'stopped' || phase.kind === 'sitting-end') {
      void navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind]);

  const curKind = state.cur?.planned.slot.kind;
  const inBlockPhase =
    phase.kind === 'item' ||
    phase.kind === 'compare' ||
    phase.kind === 'rule' ||
    phase.kind === 'tell-parent' ||
    phase.kind === 'challenge';
  const canSkipBlock = curKind !== undefined && SKIPPABLE_BLOCKS.has(curKind) && inBlockPhase;

  function submitNumber(): void {
    if (phase.kind !== 'item' || phase.view.stage !== 'answering' || value.length === 0) return;
    const answeredAt = new Date().toISOString();
    const result = timer.submit();
    const response = Number(value);
    setValue('');
    tapDispatch({
      type: 'SUBMIT',
      answeredAt,
      response,
      latencyMs: result.latencyMs,
      latencyValid: result.latencyValid,
      flashInterrupted: result.flashInterrupted,
    });
  }

  // ---------- ส่วนประกอบของหน้าข้อ ----------

  function answerColumn(enabled: boolean): React.ReactNode {
    return (
      <div className={styles.right}>
        <AnswerDisplay value={value} placeholder={texts.answerPlaceholder} />
        <Keypad
          value={value}
          onChange={setValue}
          onSubmit={submitNumber}
          submitLabel={texts.submit}
          disabled={!enabled || stopOpen}
        />
      </div>
    );
  }

  function feedbackTexts(view: ItemView): React.ReactNode {
    return (
      <div className={styles.feedback}>
        {view.feedback?.texts.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>
    );
  }

  function nextButton(): React.ReactNode {
    return (
      <div className={styles.actions}>
        <Button onClick={() => tapDispatch({ type: 'NEXT' })}>{texts.next}</Button>
      </div>
    );
  }

  function mindScreen(view: ItemView): React.ReactNode {
    const set = lesson.strategySets[0]!;
    return (
      <div className={styles.page}>
        <p className={styles.centerText}>{texts.questions.mindView}</p>
        <OptionGrid
          options={set.options.map((o) => ({ id: o.id, label: o.label, example: o.example?.text }))}
          onPick={(id) => {
            const { latencyMs, latencyValid } = strategyTimerRef.current.stop();
            tapDispatch({
              type: 'STRATEGY_PICK',
              strategyId: id as StrategyId,
              ...(latencyValid ? { strategyLatencyMs: latencyMs } : {}),
            });
          }}
        />
        {view.mind === 'optional' && (
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => tapDispatch({ type: 'STRATEGY_SKIP' })}>
              {texts.skip}
            </Button>
          </div>
        )}
      </div>
    );
  }

  function flashVisual(
    item: LessonItem,
    view: ItemView,
  ): { text: string; visual: React.ReactNode } {
    const n = nOf(item);
    if (view.stage === 'ready') {
      return {
        text: texts.flash.ready,
        visual: <TenFrame key={item.id} mode="hidden" filled={n} />,
      };
    }
    if (view.stage === 'show') {
      return {
        text: texts.flash.show,
        visual: (
          <TenFrame
            key={`${item.id}-flash`}
            mode="flash"
            flashMs={lesson.timing.flashMs}
            colorMode="split-5"
            filled={n}
            cssFadeIn
            onFlashEnd={() => dispatch({ type: 'FLASH_END' })}
          />
        ),
      };
    }
    return {
      text: texts.flash.hiddenGap,
      visual: <TenFrame key={item.id} mode="hidden" filled={n} />,
    };
  }

  // กล่อง n จุดพร้อมไฮไลต์ช่องว่าง (หน้าเฉลยของ A2, ภาพเมื่อตอบผิดใน A3)
  function boxWithGap(item: LessonItem): React.ReactNode {
    const n = nOf(item);
    return (
      <TenFrame
        mode="show"
        size="md"
        filled={n}
        colorMode="split-5"
        highlight={{ indices: range(n, 9), pulse: true }}
      />
    );
  }

  function itemScreen(item: LessonItem, view: ItemView): React.ReactNode {
    if (view.stage === 'ack') {
      return <p className={styles.centerText}>{view.ackText}</p>;
    }
    if (view.stage === 'mind') return mindScreen(view);

    const n = item.problem.kind === 'missing-part' || item.problem.kind === 'arith' ? nOf(item) : 0;

    switch (item.flow) {
      case 'silent-flash-gap':
      case 'teach-flash-gap': {
        if (view.stage === 'feedback') {
          return (
            <div className={styles.page}>
              <div className={styles.visualWrap}>{boxWithGap(item)}</div>
              <div className={styles.bondWrap}>
                <NumberBond mode="show" size="sm" whole={10} parts={[n, 10 - n]} />
              </div>
              {feedbackTexts(view)}
              {nextButton()}
            </div>
          );
        }
        const { text, visual } = flashVisual(item, view);
        return (
          <div className={styles.itemLayout}>
            <div className={styles.left}>
              <p className={styles.centerText}>{text}</p>
              <div className={styles.visualWrap}>{visual}</div>
            </div>
            {answerColumn(view.stage === 'answering')}
          </div>
        );
      }

      case 'silent-text':
      case 'mind-gap': {
        if (view.stage === 'feedback') {
          const wrong = view.feedback?.highlight === 'gap-cells';
          return (
            <div className={styles.page}>
              <p className={styles.problem}>{formatProblem(item.problem)}</p>
              {wrong && <div className={styles.visualWrap}>{boxWithGap(item)}</div>}
              {feedbackTexts(view)}
              {nextButton()}
            </div>
          );
        }
        return (
          <div className={styles.itemLayout}>
            <div className={styles.left}>
              <p className={styles.problem}>{formatProblem(item.problem)}</p>
            </div>
            {answerColumn(view.stage === 'answering')}
          </div>
        );
      }

      case 'guided-fill': {
        const k = view.added.length;
        const answering = view.stage === 'answering';
        const ring =
          view.feedback && view.feedback.highlight === 'gap-cells'
            ? { indices: range(n, 9), pulse: true }
            : undefined;
        const left = (
          <div className={styles.left}>
            <p className={styles.centerText}>{texts.questions.a1}</p>
            <div className={styles.visualWrap}>
              <TenFrame
                mode="show"
                size="md"
                interactive={answering}
                filled={n}
                colorMode="split-5"
                added={view.added}
                highlight={ring}
                onCellTap={(index) => dispatch({ type: 'TAP_CELL', index })}
              />
              <NumberBond mode="show" size="sm" whole={10} parts={[n, k === 0 ? '?' : k]} />
            </div>
            {feedbackTexts(view)}
          </div>
        );
        if (view.stage === 'feedback') {
          return (
            <div className={styles.page}>
              {left}
              {nextButton()}
            </div>
          );
        }
        return (
          <div className={styles.itemLayout}>
            {left}
            {answerColumn(answering)}
          </div>
        );
      }

      default:
        // ส่วน B (รอบที่ 2): ไม่มีหน้าจอในรอบนี้ (แผนของรอบที่ 1 ไม่รวมส่วน B)
        return null;
    }
  }

  // ---------- เลือกหน้าตาม phase ----------

  let content: React.ReactNode;

  switch (phase.kind) {
    case 'sitting-intro':
      content = (
        <div className={styles.page}>
          <h1 className={styles.title}>{lesson.title}</h1>
          <p className={styles.centerText}>{fill(texts.card.sitting, { n: plan.sitting })}</p>
          <div className={styles.actions}>
            <Button onClick={() => tapDispatch({ type: 'START' })}>
              {texts.sittingIntro.button}
            </Button>
          </div>
        </div>
      );
      break;
    case 'block-intro':
      content = (
        <div className={styles.page}>
          <p className={styles.centerText}>{phase.text}</p>
          <div className={styles.actions}>
            <Button onClick={() => tapDispatch({ type: 'BLOCK_GO' })}>{texts.go}</Button>
          </div>
        </div>
      );
      break;
    case 'item':
      content = itemScreen(phase.item, phase.view);
      break;
    case 'rule':
    case 'tell-parent':
    case 'round-end':
      content = (
        <div className={styles.page}>
          <p className={styles.centerText}>{phase.text}</p>
          {nextButton()}
        </div>
      );
      break;
    case 'parent-instruction': {
      const g = lesson.parentGuide.instructions;
      const text =
        phase.reason === 'talk-A'
          ? g.talkA
          : phase.reason === 'tray-B1'
            ? g.trayB1
            : phase.reason === 'stalled-A'
              ? g.stalledA
              : g.stalledB;
      content = (
        <div className={styles.page}>
          <p className={styles.centerText}>{text}</p>
          <div className={styles.actions}>
            <Button onClick={() => tapDispatch({ type: 'PARENT_CONTINUE' })}>{texts.next}</Button>
            <Button variant="secondary" onClick={() => tapDispatch({ type: 'PARENT_DONE' })}>
              {g.done}
            </Button>
          </div>
        </div>
      );
      break;
    }
    case 'handover':
      content = (
        <div className={styles.page}>
          <p className={styles.centerText}>{texts.handover}</p>
          <div className={styles.actions}>
            <Button onClick={() => tapDispatch({ type: 'HANDOVER_DONE' })}>{texts.next}</Button>
          </div>
        </div>
      );
      break;
    case 'parent-note': {
      const part = phase.blockKinds[phase.index]!;
      content = (
        <div className={styles.page}>
          <div className={styles.summary}>
            {state.session.blocks
              .filter((b) => (b.kind === 'A' || b.kind === 'B') && b.outcome !== 'done')
              .map((b, i) => (
                <p key={i}>
                  {lessonStrings.part[b.kind as 'A' | 'B']}:{' '}
                  {lessonStrings.outcome[b.outcome] ?? b.outcome}
                </p>
              ))}
            {state.session.flags.map((f, i) => (
              <p key={`f${i}`}>{lessonStrings.flag[f] ?? f}</p>
            ))}
          </div>
          <ParentNoteForm
            key={part}
            texts={texts.parentNote}
            partLabel={lessonStrings.part[part]}
            onSave={(v) => dispatch({ type: 'NOTE_SAVE', ...v })}
            onSkip={() => dispatch({ type: 'NOTE_SKIP' })}
          />
        </div>
      );
      break;
    }
    default:
      content = null;
  }

  return (
    // หน้าบันทึกของพ่อเป็นหน้าของพ่อ ไม่อยู่ใต้ tap guard (พ่อรับเครื่องต่อจากลูกทันทีได้)
    <div
      className={styles.wrap}
      onClickCapture={
        phase.kind === 'parent-note' ||
        (phase.kind === 'block-intro' && phase.slot.variant === 'a2-retry')
          ? undefined
          : guardPointer
      }
    >
      {content}
      <ConfirmDialog
        open={stopOpen}
        title={texts.stop.title}
        body={texts.stop.body}
        confirmLabel={texts.stop.confirmLabel}
        cancelLabel={texts.stop.cancelLabel}
        extraAction={
          canSkipBlock
            ? {
                label: texts.stop.skipBlockLabel,
                onClick: () => {
                  setStopOpen(false);
                  dispatch({ type: 'SKIP_BLOCK' });
                },
              }
            : undefined
        }
        onConfirm={() => {
          setStopOpen(false);
          dispatch({ type: 'STOP' });
        }}
        onCancel={() => setStopOpen(false)}
      />
    </div>
  );
}
