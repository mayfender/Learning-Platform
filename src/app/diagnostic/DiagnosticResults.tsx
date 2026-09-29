import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useProgress } from '@/app/ProgressProvider';
import { formatText } from '@/app/diagnostic/formatText';
import { HistoryList } from '@/app/diagnostic/HistoryList';
import { loadDiagnosticSessions } from '@/app/diagnostic/loadSessions';
import styles from '@/app/diagnostic/DiagnosticResults.module.css';
import { diagnostics } from '@/content/registry';
import { summarize } from '@/engine/diagnostic/summary';
import type { AnswerRecord } from '@/engine/diagnostic/types';
import { formatProblem } from '@/engine/problem';
import type {
  Diagnostic,
  DiagnosticSummary,
  ItemAnsweredEvent,
  StageSummary,
} from '@/engine/types';
import type { SessionView } from '@/engine/diagnostic/sessions';
import { exportData, exportFileName } from '@/store/exportImport';
import { Button } from '@/ui/Button';

function itemToAnswerRecord(e: ItemAnsweredEvent): AnswerRecord {
  return {
    itemId: e.itemId,
    stageId: e.stageId ?? '',
    ladderSteps: e.ladderSteps ?? [],
    skillId: e.skillId,
    problem: e.problem,
    expected: e.expected,
    response: e.response,
    correct: e.correct,
    misconceptionId: e.misconceptionId,
    latencyMs: e.latencyMs,
    latencyValid: e.latencyValid,
    fluentMs: e.fluentMs,
    fluent: e.fluent,
    strategySetId: e.strategySetId,
    strategyId: e.strategyId,
    flashInterrupted: e.flashInterrupted,
  };
}

function strategyLabel(dx: Diagnostic, setId: string | undefined, id: string | undefined): string {
  if (!setId || !id) return '—';
  const set = dx.strategySets.find((s) => s.id === setId);
  return set?.options.find((o) => o.id === id)?.label ?? '—';
}

export function DiagnosticResults() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { store, outbox, currentLearner } = useProgress();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dx, setDx] = useState<Diagnostic | undefined>(undefined);
  const [summary, setSummary] = useState<DiagnosticSummary | undefined>(undefined);
  const [items, setItems] = useState<ItemAnsweredEvent[]>([]);
  const [inProgress, setInProgress] = useState(false);
  const [history, setHistory] = useState<SessionView[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!sessionId) return;
      setLoading(true);
      const sessions = await loadDiagnosticSessions(store, outbox, { sessionId });
      const session = sessions[0];
      if (!session) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }
      const activityDx = diagnostics[session.activityId];
      let resolvedSummary = session.summary;
      if (
        !resolvedSummary &&
        session.status === 'open' &&
        activityDx &&
        session.activityVersion === activityDx.version
      ) {
        const answers = session.items.map(itemToAnswerRecord);
        resolvedSummary = summarize(activityDx, answers, [], 'partial');
      }
      if (!cancelled) {
        setDx(activityDx);
        setSummary(resolvedSummary);
        setItems([...session.items]);
        setInProgress(session.status !== 'complete');
        setLoading(false);
      }
      if (currentLearner) {
        const hist = await loadDiagnosticSessions(store, outbox, {
          learnerId: currentLearner.id,
          activityId: session.activityId,
        });
        if (!cancelled) setHistory(hist);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, store, outbox, currentLearner]);

  if (loading) return <p>กำลังโหลด…</p>;
  if (notFound || !dx) {
    return (
      <div>
        <p>ไม่พบผลนี้</p>
        <Link to="/parent">กลับหน้าสำหรับพ่อ</Link>
      </div>
    );
  }

  const texts = dx.texts.results;
  const incomplete = !summary || summary.recommendation.kind === 'incomplete';

  async function onExport(): Promise<void> {
    const file = await exportData(store);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(new Date());
    a.click();
    URL.revokeObjectURL(url);
  }

  function stageRow(s: StageSummary, title: string) {
    const totalItems = dx!.stages.find((st) => st.id === s.stageId)?.items.length ?? 0;
    const levelText =
      s.status === 'skipped'
        ? texts.levels.skipped
        : s.status === 'incomplete'
          ? texts.stageStatusIncomplete
          : s.status === 'not-reached'
            ? texts.stageStatusNotReached
            : s.level
              ? texts.levels[s.level]
              : '—';
    return (
      <tr key={s.stageId}>
        <td>{title}</td>
        <td>
          {s.correct}/{totalItems}
        </td>
        <td>{s.meanLatencyMs !== null ? (s.meanLatencyMs / 1000).toFixed(1) : '—'}</td>
        <td>{s.countingCount !== null ? s.countingCount : '—'}</td>
        <td>{levelText}</td>
      </tr>
    );
  }

  const groupTextByStatus: Record<string, string> = {
    pass: texts.groupPass,
    fail: texts.groupFail,
    skipped: texts.groupSkipped,
    'not-evaluated': texts.groupNotEvaluated,
  };

  return (
    <div>
      <h1>{dx.title}</h1>
      {inProgress && <span className={styles.badge}>{texts.inProgressBadge}</span>}
      <Link to="/parent">กลับหน้าสำหรับพ่อ</Link>

      <section className={styles.section}>
        <h2>ขั้นที่แนะนำ</h2>
        {summary && summary.recommendation.kind === 'step' ? (
          (() => {
            const rec = summary.recommendation;
            const stepName = dx.ladder.find((l) => l.step === rec.ladderStep)?.name ?? '';
            const rule = dx.recommendation.find((r) => r.no === rec.ruleNo);
            return (
              <>
                <p>{formatText(texts.recommend, { n: rec.ladderStep, name: stepName })}</p>
                {rule && <p>{rule.reason}</p>}
              </>
            );
          })()
        ) : (
          <p>{texts.incomplete}</p>
        )}
        <p>{texts.parentNote}</p>
      </section>

      <section className={styles.section}>
        <h2>ผลรายด่าน</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>ด่าน</th>
                <th>ถูก</th>
                <th>เวลาเฉลี่ย (วิ)</th>
                <th>ใช้การนับ</th>
                <th>ระดับ</th>
              </tr>
            </thead>
            <tbody>
              {summary?.stages
                .filter((s) => !dx.stages.find((st) => st.id === s.stageId)?.groups)
                .map((s) => {
                  const stage = dx.stages.find((st) => st.id === s.stageId)!;
                  return stageRow(s, `ด่าน ${stage.number} · ${stage.title}`);
                })}
              {summary?.groups.map((g) => (
                <tr key={g.groupId}>
                  <td>{g.groupId}</td>
                  <td colSpan={3} />
                  <td>{groupTextByStatus[g.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!incomplete && summary && summary.recommendation.kind === 'step' && (
        <section className={styles.section}>
          <h2>บันไดการบวก</h2>
          <ul className={styles.ladder}>
            {dx.ladder.map((step) => {
              const recStep =
                summary.recommendation.kind === 'step' ? summary.recommendation.ladderStep : 0;
              const isCurrent = step.step === recStep;
              const isPassed = step.step < recStep;
              return (
                <li key={step.step} className={isCurrent ? styles.ladderCurrent : undefined}>
                  ขั้นที่ {step.step}: {step.name}
                  {isPassed && ` — ${texts.ladderPassed}`}
                  {isCurrent && ` ${texts.ladderStart}`}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2>ความเข้าใจผิดที่พบ</h2>
        {summary && summary.misconceptions.length > 0 ? (
          <ul>
            {summary.misconceptions.map((m) => {
              const desc = dx.misconceptions.find((mm) => mm.id === m.id)?.description ?? '';
              return (
                <li key={m.id}>
                  {m.id} — {desc} (
                  {formatText(texts.foundInItems, { itemIds: m.itemIds.join(', ') })})
                </li>
              );
            })}
          </ul>
        ) : (
          <p>{texts.noMisconception}</p>
        )}
      </section>

      <section className={styles.section}>
        <h2>รายละเอียดทุกข้อ</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>ข้อ</th>
                <th>โจทย์</th>
                <th>คำตอบ</th>
                <th>ผล</th>
                <th>เวลา (วิ)</th>
                <th>คล่อง</th>
                <th>วิธีคิด</th>
                <th>ความเข้าใจผิด</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const fluentText =
                  e.fluent === null
                    ? texts.fluentDash
                    : e.fluent
                      ? texts.fluentYes
                      : texts.fluentNo;
                return (
                  <tr key={e.itemId}>
                    <td>{e.itemId}</td>
                    <td>{formatProblem(e.problem)}</td>
                    <td>{e.response}</td>
                    <td>
                      {e.correct
                        ? texts.correct
                        : formatText(texts.wrongWithExpected, { expected: e.expected })}
                    </td>
                    <td>
                      {(e.latencyMs / 1000).toFixed(1)}
                      {!e.latencyValid && ' *'}
                    </td>
                    <td>{fluentText}</td>
                    <td>{strategyLabel(dx, e.strategySetId, e.strategyId)}</td>
                    <td>{e.misconceptionId ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {items.some((e) => !e.latencyValid) && <p>{texts.timeFootnote}</p>}
      </section>

      {!incomplete && summary && summary.recommendation.kind === 'step' && (
        <section className={styles.section}>
          <h2>คุยกันต่อ (Number Talks)</h2>
          {(() => {
            const recStep = summary.recommendation.ladderStep;
            const talk = dx.numberTalks.items.find((t) => t.ladderStep === recStep);
            if (!talk) return null;
            return (
              <div>
                <p>{talk.prompt}</p>
                <ul>
                  {talk.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
                <ul>
                  {dx.numberTalks.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.actions}>
          <Button onClick={() => void navigate(`/play/${dx.id}`)}>{texts.retry}</Button>
          <Button variant="secondary" onClick={() => void onExport()}>
            ดาวน์โหลดไฟล์สำรอง (export)
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2>ประวัติ</h2>
        <HistoryList sessions={history} currentSessionId={sessionId} />
      </section>
    </div>
  );
}
