import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { strings } from '@/app/strings';
import { UpdateBanner } from '@/app/UpdateBanner';
import { useProgress } from '@/app/ProgressProvider';
import { applyTheme, readTheme, writeTheme, type ThemePref } from '@/app/theme';
import { HistoryList } from '@/app/diagnostic/HistoryList';
import { loadDiagnosticSessions } from '@/app/diagnostic/loadSessions';
import { lessonStrings } from '@/app/lesson/lessonStrings';
import { diagnostics, lessons } from '@/content/registry';
import type { SessionView } from '@/engine/diagnostic/sessions';
import { Button } from '@/ui/Button';
import {
  NewerSchemaError,
  NotOurFileError,
  exportData,
  exportFileName,
  importData,
} from '@/store/exportImport';
import type { PersistResult } from '@/store/ProgressStore';
import styles from '@/app/routes/Parent.module.css';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isIosNotInstalled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone =
    nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  if (standalone) return false;
  const ua = navigator.userAgent;
  const isIphoneOrIpad = /iPhone|iPad/.test(ua);
  const isIpadOsMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return isIphoneOrIpad || isIpadOsMac;
}

export function Parent() {
  const { store, outbox, storageMode, learners, currentLearner, setCurrentLearner } = useProgress();
  const [theme, setTheme] = useState<ThemePref>(() => readTheme());
  const [persistResult, setPersistResult] = useState<PersistResult | undefined>(undefined);
  const [pendingCount, setPendingCount] = useState(outbox.pending().length);
  const [lastExportAt, setLastExportAt] = useState<string | undefined>(undefined);
  const [hasEvents, setHasEvents] = useState(false);
  const [importMessage, setImportMessage] = useState<string | undefined>(undefined);
  const [importError, setImportError] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = outbox.subscribe(() => setPendingCount(outbox.pending().length));
    return unsubscribe;
  }, [outbox]);

  useEffect(() => {
    void store.getMeta('persistence').then((p) => setPersistResult(p?.result));
    void store.getMeta('lastExportAt').then(setLastExportAt);
    void store.listEvents().then((events) => setHasEvents(events.length > 0));
  }, [store]);

  useEffect(() => {
    if (!currentLearner) {
      setSessions([]);
      return;
    }
    void loadDiagnosticSessions(store, outbox, { learnerId: currentLearner.id }).then((all) =>
      // ประวัติในส่วนนี้เฉพาะแบบทดสอบวินิจฉัย (บทเรียนดูที่หน้าพ่อของบท)
      setSessions(all.filter((s) => diagnostics[s.activityId] !== undefined)),
    );
  }, [store, outbox, currentLearner]);

  function onThemeChange(next: ThemePref): void {
    setTheme(next);
    writeTheme(next);
    applyTheme(next);
  }

  async function onExport(): Promise<void> {
    const file = await exportData(store);
    setLastExportAt(file.exportedAt);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(new Date());
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File): Promise<void> {
    setImportError(undefined);
    setImportMessage(undefined);
    try {
      const text = await file.text();
      const json: unknown = JSON.parse(text);
      const result = await importData(store, json);
      setImportMessage(
        strings.parent.importResult(
          result.learnersAdded,
          result.eventsAdded,
          result.eventsSkipped,
          result.invalid,
        ),
      );
    } catch (err) {
      if (err instanceof NotOurFileError) {
        setImportError(strings.parent.importErrorNotOurFile);
      } else if (err instanceof NewerSchemaError) {
        setImportError(strings.parent.importErrorNewerSchema);
      } else {
        setImportError(strings.parent.importErrorNotOurFile);
      }
    }
  }

  const backupOverdue =
    hasEvents && (!lastExportAt || Date.now() - new Date(lastExportAt).getTime() > SEVEN_DAYS_MS);

  return (
    <div>
      <h1>{strings.parent.title}</h1>
      <Link to="/">{strings.parent.backHome}</Link>

      <section className={styles.section}>
        <h2>{strings.parent.learnerSectionTitle}</h2>
        {currentLearner && <p>{currentLearner.nickname}</p>}
        {learners.length > 1 && (
          <label>
            {strings.parent.currentLearnerLabel}
            <select
              className={styles.select}
              value={currentLearner?.id ?? ''}
              onChange={(e) => void setCurrentLearner(e.target.value)}
            >
              {learners.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nickname}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className={styles.section}>
        <h2>{lessonStrings.parentPage.linkSection}</h2>
        <ul className={styles.linkList}>
          {Object.values(lessons).map((lesson) => (
            <li key={lesson.id}>
              <Link to={`/parent/lesson/${lesson.id}`}>
                {lessonStrings.parentPage.openLink(lesson.title)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>ผลแบบทดสอบ</h2>
        <HistoryList sessions={sessions} />
      </section>

      <section className={styles.section}>
        <h2>{strings.parent.backupSectionTitle}</h2>
        <div className={styles.actions}>
          <Button onClick={() => void onExport()}>{strings.parent.exportButton}</Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            {strings.parent.importButton}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
        {importMessage && <p>{importMessage}</p>}
        {importError && <p className={styles.warning}>{importError}</p>}
        {backupOverdue && <p className={styles.warning}>{strings.parent.backupOverdueWarning}</p>}
      </section>

      <section className={styles.section}>
        <h2>{strings.parent.storageSectionTitle}</h2>
        {persistResult === 'granted' && <p>{strings.parent.persistGranted}</p>}
        {persistResult === 'denied' && <p>{strings.parent.persistDenied}</p>}
        {persistResult === 'unsupported' && <p>{strings.parent.persistUnsupported}</p>}
        {storageMode === 'memory-fallback' && (
          <p className={styles.warning}>{strings.parent.memoryFallbackWarning}</p>
        )}
        {pendingCount > 0 && <p>{strings.parent.outboxPending(pendingCount)}</p>}
        {isIosNotInstalled() && <p>{strings.parent.iosInstallHint}</p>}
      </section>

      <section className={styles.section}>
        <h2>{strings.parent.themeSectionTitle}</h2>
        <div className={styles.actions}>
          <label>
            <input
              type="radio"
              name="theme"
              checked={theme === 'system'}
              onChange={() => onThemeChange('system')}
            />
            {strings.parent.themeSystem}
          </label>
          <label>
            <input
              type="radio"
              name="theme"
              checked={theme === 'light'}
              onChange={() => onThemeChange('light')}
            />
            {strings.parent.themeLight}
          </label>
          <label>
            <input
              type="radio"
              name="theme"
              checked={theme === 'dark'}
              onChange={() => onThemeChange('dark')}
            />
            {strings.parent.themeDark}
          </label>
        </div>
      </section>

      <UpdateBanner />
    </div>
  );
}
