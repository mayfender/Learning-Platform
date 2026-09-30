import { useState } from 'react';
import { Link } from 'react-router';
import { strings } from '@/app/strings';
import { UpdateBanner } from '@/app/UpdateBanner';
import { useProgress } from '@/app/ProgressProvider';
import { useLessonData } from '@/app/lesson/useLessonData';
import { diagnostics, lessons } from '@/content/registry';
import { fill } from '@/engine/lesson/feedback';
import type { Lesson } from '@/engine/lesson/types';
import { Button } from '@/ui/Button';
import styles from '@/app/routes/Home.module.css';

// การ์ดบทเรียน (P12): ชื่อบท + บรรทัดรอง "ครั้งที่ n" หรือ "ทำครบแล้ว" ไม่มีเวลา/คะแนน/จำนวนที่ค้าง
function LessonCard({ lesson }: { lesson: Lesson }) {
  const data = useLessonData(lesson);
  const progress = data?.progress;
  // "ทำครบแล้ว" เมื่อครบทุกครั้งและปริศนาท้ายบทจบแล้ว ไม่งั้นแสดงครั้งที่ปัจจุบัน (ไม่เกินจำนวนครั้งของบท)
  const sub =
    progress === undefined
      ? undefined
      : progress.sitting > lesson.sittings.length && progress.challengeDone
        ? lesson.texts.card.done
        : fill(lesson.texts.card.sitting, {
            n: Math.min(progress.sitting, lesson.sittings.length),
          });
  return (
    <Link className={styles.activityCard} to={`/play/${lesson.id}`}>
      <span>{lesson.title}</span>
      {sub && <span className={styles.cardSub}>{sub}</span>}
    </Link>
  );
}

export function Home() {
  const { currentLearner, createLearner } = useProgress();
  const [nickname, setNickname] = useState('');

  if (!currentLearner) {
    const trimmed = nickname.trim();
    const valid = trimmed.length >= 1 && trimmed.length <= 20;

    return (
      <div>
        <h1>{strings.home.welcomeTitle}</h1>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) void createLearner(trimmed);
          }}
        >
          <label htmlFor="nickname">{strings.home.nicknameLabel}</label>
          <input
            id="nickname"
            className={styles.input}
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={40}
          />
          <p className={styles.hint}>{strings.home.nicknameHint}</p>
          <Button type="submit" disabled={!valid}>
            {strings.home.startButton}
          </Button>
        </form>
      </div>
    );
  }

  const lessonList = Object.values(lessons);
  const activities = Object.values(diagnostics);

  return (
    <div>
      <h1>{strings.home.greeting(currentLearner.nickname)}</h1>
      {activities.length + lessonList.length === 0 ? (
        <p>{strings.home.noActivity}</p>
      ) : (
        <ul className={styles.activityList}>
          {lessonList.map((lesson) => (
            <li key={lesson.id}>
              <LessonCard lesson={lesson} />
            </li>
          ))}
          {activities.map((dx) => (
            <li key={dx.id}>
              <Link className={styles.activityCard} to={`/play/${dx.id}`}>
                {dx.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <UpdateBanner />
    </div>
  );
}
