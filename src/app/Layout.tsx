import { Outlet, useNavigate } from 'react-router';
import styles from '@/app/Layout.module.css';
import { useLogoLongPressOverride } from '@/app/LayoutContext';
import { Logo } from '@/ui/Logo';
import { useLongPress } from '@/ui/useLongPress';

export function Layout() {
  const navigate = useNavigate();
  const override = useLogoLongPressOverride();
  const onLogoLongPress = override ?? (() => navigate('/parent'));
  const longPressHandlers = useLongPress(onLogoLongPress, { ms: 2000 });

  return (
    <>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.logoButton}
          aria-label="โลโก้"
          {...longPressHandlers}
        >
          <Logo />
        </button>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
