import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router';
import { useProgress } from '@/app/ProgressProvider';
import { ParentNoteForm } from '@/app/lesson/ParentNoteForm';
import { lessonStrings } from '@/app/lesson/lessonStrings';
import { useLessonData } from '@/app/lesson/useLessonData';
import { lessons } from '@/content/registry';
import type { LessonProgress } from '@/engine/lesson/progress';
import type { Lesson } from '@/engine/lesson/types';
import { formatProblem } from '@/engine/problem';
import type { AppEvent, EventPayload, LessonFlag, NoteFrequency } from '@/engine/types';
import { newId } from '@/store/ids';
import { Button } from '@/ui/Button';
import styles from '@/app/lesson/ParentLesson.module.css';

type AnsweredEvent = Extract<AppEvent, { type: 'item.answered' }>;

function partStatusText(progress: LessonProgress, part: 'A' | 'B'): string {
  const st = progress[part].status;
  return lessonStrings.outcome[st] ?? st;
}

function lastMetrics(progress: LessonProgress, part: 'A' | 'B'): string | undefined {
  const runs = progress.runs.filter(
    (r) => r.kind === part && r.completed && r.completed.outcome !== 'done' && r.completed.metrics,
  );
  const m = runs.at(-1)?.completed?.metrics;
  return m ? lessonStrings.parentPage.metrics(m.correct, m.total) : undefined;
}

function skippedByCheck(progress: LessonProgress, part: 'A' | 'B'): boolean {
  return progress.runs.some((r) => r.kind === part && r.skipped?.reason === 'check');
}

function noteText(lesson: Lesson, note: LessonProgress['notes']['A']): string | undefined {
  if (!note) return undefined;
  const t = lesson.texts.parentNote;
  const parts: string[] = [];
  if (note.fingers) parts.push(`${t.fingers}: ${lessonStrings.noteFrequency[note.fingers]}`);
  if (note.mouth) parts.push(`${t.mouth}: ${lessonStrings.noteFrequency[note.mouth]}`);
  if (note.note) parts.push(note.note);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

// หน้าพ่อของบทเรียน /parent/lesson/:lessonId (Tech Spec §5.7): เวลา/คะแนนแสดงได้เฉพาะหน้านี้
export function ParentLesson() {
  const { lessonId } = useParams();
  const lesson = lessonId ? lessons[lessonId] : undefined;
  if (!lesson) {
    return (
      <div>
        <p>ไม่พบบทเรียนนี้</p>
        <Link to="/parent">{lessonStrings.parentPage.back}</Link>
      </div>
    );
  }
  return <ParentLessonView key={lesson.id} lesson={lesson} />;
}

function ParentLessonView({ lesson }: { lesson: Lesson }) {
  const { outbox, currentLearner } = useProgress();
  const data = useLessonData(lesson);
  const sessionIdRef = useRef(newId());
  const lastAtRef = useRef(0);

  useEffect(() => {
    const last = data?.events.at(-1);
    if (last) lastAtRef.current = Math.max(lastAtRef.current, Date.parse(last.at));
  }, [data]);

  if (!data || !currentLearner) return null;
  const { progress, events } = data;
  const learnerId = currentLearner.id;
  const guide = lesson.parentGuide;
  const strings = lessonStrings.parentPage;

  function emit(payload: EventPayload): void {
    // เวลาเพิ่มขึ้นเคร่งครัดและไม่ต่ำกว่า event ล่าสุดของบท (นาฬิกาเครื่องอาจถอยหรือค้างได้)
    const at = new Date(Math.max(Date.now(), lastAtRef.current + 1)).toISOString();
    lastAtRef.current = Date.parse(at);
    outbox.append([
      {
        ...payload,
        id: newId(),
        at,
        schemaVersion: 1,
        learnerId,
        sessionId: sessionIdRef.current,
        activityId: lesson.id,
      },
    ]);
  }

  const flagText: Record<LessonFlag, string> = {
    'talk-A': guide.instructions.talkA,
    'tray-B1': guide.instructions.trayB1,
    'stalled-A': guide.instructions.stalledA,
    'stalled-B': guide.instructions.stalledB,
  };

  const answered = events.filter((e): e is AnsweredEvent => e.type === 'item.answered');
  const strategyLabel = (e: AnsweredEvent): string => {
    if (!e.strategySetId || !e.strategyId) return '—';
    const set = lesson.strategySets.find((s) => s.id === e.strategySetId);
    return set?.options.find((o) => o.id === e.strategyId)?.label ?? '—';
  };

  const taughtParts = (['A', 'B'] as const).filter((p) => progress.runs.some((r) => r.kind === p));
  const col = strings.columns;

  return (
    <div>
      <h1>{lesson.title}</h1>
      <Link to="/parent">{strings.back}</Link>

      <section className={styles.section}>
        <h2>{strings.progressHeading}</h2>
        <ul className={styles.list}>
          <li>{strings.sittingsDone(progress.sittingsCompleted)}</li>
          <li>
            {lessonStrings.part.check}:{' '}
            {progress.check.done ? lessonStrings.outcome.done : lessonStrings.outcome.todo}
          </li>
          {(['A', 'B'] as const).map((p) => {
            const metrics = lastMetrics(progress, p);
            return (
              <li key={p}>
                {lessonStrings.part[p]}: {partStatusText(progress, p)}
                {metrics ? ` · ${metrics}` : ''}
                {skippedByCheck(progress, p) ? ` · ${strings.skippedByCheck}` : ''}
              </li>
            );
          })}
        </ul>
      </section>

      {progress.pendingFlags.length > 0 && (
        <section className={styles.section}>
          <h2>{lessonStrings.flagsHeading}</h2>
          <ul className={styles.plain}>
            {progress.pendingFlags.map((flag, i) => (
              <li key={`${flag}-${i}`} className={styles.flag}>
                <p>{lessonStrings.flag[flag] ?? flag}</p>
                <p>{flagText[flag]}</p>
                <div className={styles.actions}>
                  <Button onClick={() => emit({ type: 'parent.noted', resolvedFlag: flag })}>
                    {guide.instructions.done}
                  </Button>
                  {flag === 'stalled-B' && (
                    <Button
                      variant="secondary"
                      onClick={() => emit({ type: 'parent.noted', resolvedFlag: 'restart-B' })}
                    >
                      {guide.instructions.restartB}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2>{guide.materials.title}</h2>
        <ul className={styles.list}>
          {guide.materials.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>{guide.numberTalks.title}</h2>
        <div className={styles.talkBlock}>
          <p>{guide.numberTalks.problems}</p>
          <p>
            {guide.numberTalks.openingQuestions.map((q) => `"${q}"`).join(' · ')} (
            {guide.numberTalks.openingNote})
          </p>
        </div>
        <ul className={styles.list}>
          {guide.numberTalks.thoughts.map((t) => (
            <li key={t.thought}>
              {t.thought}: {t.response}
            </li>
          ))}
        </ul>
        <ul className={styles.list}>
          {guide.numberTalks.avoid.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>{strings.challengeHeading}</h2>
        <p>{guide.challengeExtension.question}</p>
        <p>
          {strings.answerLabel}: {guide.challengeExtension.answer}
        </p>
      </section>

      <section className={styles.section}>
        <h2>{strings.notesHeading}</h2>
        {taughtParts.length === 0 && <p className={styles.muted}>{strings.noNote}</p>}
        {taughtParts.map((p) => {
          const latest = noteText(lesson, progress.notes[p]);
          return (
            <div key={p} className={styles.section}>
              <h3>{lessonStrings.noteFor(lessonStrings.part[p])}</h3>
              <p>{latest ? `${strings.latestNote}: ${latest}` : strings.noNote}</p>
              <ParentNoteForm
                texts={lesson.texts.parentNote}
                partLabel={lessonStrings.part[p]}
                onSave={(v: { fingers: NoteFrequency; mouth: NoteFrequency; note?: string }) =>
                  emit({ type: 'parent.noted', blockKind: p, ...v })
                }
              />
            </div>
          );
        })}
      </section>

      <section className={styles.section}>
        <h2>{strings.tableHeading}</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{col.item}</th>
                <th>{col.section}</th>
                <th>{col.problem}</th>
                <th>{col.response}</th>
                <th>{col.result}</th>
                <th>{col.time}</th>
                <th>{col.fluent}</th>
                <th>{col.mind}</th>
                <th>{col.misconception}</th>
                <th>{col.step}</th>
              </tr>
            </thead>
            <tbody>
              {answered.map((e) => (
                <tr key={e.id}>
                  <td>{e.itemId}</td>
                  <td>{e.section ?? '—'}</td>
                  <td>{formatProblem(e.problem)}</td>
                  <td>{e.response}</td>
                  <td>{e.correct ? strings.right : strings.wrong(e.expected)}</td>
                  <td>
                    {(e.latencyMs / 1000).toFixed(1)}
                    {!e.latencyValid && ' *'}
                  </td>
                  <td>
                    {e.fluent === null ? '—' : e.fluent ? strings.fluentYes : strings.fluentNo}
                  </td>
                  <td>{strategyLabel(e)}</td>
                  <td>{e.misconceptionId ?? '—'}</td>
                  <td>
                    {e.stepId ? e.stepId : '—'}
                    {e.attemptNo > 1 ? ` · ${e.attemptNo}` : ''}
                    {e.revealed ? ' · เฉลยให้' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {answered.some((e) => !e.latencyValid) && <p>{strings.timeFootnote}</p>}
      </section>
    </div>
  );
}
