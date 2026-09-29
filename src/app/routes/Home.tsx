import { useState } from 'react';
import { Link } from 'react-router';
import { strings } from '@/app/strings';
import { UpdateBanner } from '@/app/UpdateBanner';
import { useProgress } from '@/app/ProgressProvider';
import { diagnostics } from '@/content/registry';
import { Button } from '@/ui/Button';
import styles from '@/app/routes/Home.module.css';

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

  const activities = Object.values(diagnostics);

  return (
    <div>
      <h1>{strings.home.greeting(currentLearner.nickname)}</h1>
      {activities.length === 0 ? (
        <p>{strings.home.noActivity}</p>
      ) : (
        <ul className={styles.activityList}>
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
