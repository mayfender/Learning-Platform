import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { Layout } from '@/app/Layout';
import { LogoLongPressProvider } from '@/app/LayoutContext';
import { ProgressProvider } from '@/app/ProgressProvider';
import { DiagnosticResults } from '@/app/diagnostic/DiagnosticResults';
import { Home } from '@/app/routes/Home';
import { Parent } from '@/app/routes/Parent';
import { Play } from '@/app/routes/Play';
import { strings } from '@/app/strings';

const DevManipulatives = import.meta.env.DEV
  ? lazy(() => import('@/app/routes/DevManipulatives'))
  : undefined;

export function App() {
  return (
    <HashRouter>
      <ProgressProvider>
        <LogoLongPressProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/play/:activityId" element={<Play />} />
              <Route path="/parent" element={<Parent />} />
              <Route path="/parent/results/:sessionId" element={<DiagnosticResults />} />
              {DevManipulatives && (
                <Route
                  path="/dev/manipulatives"
                  element={
                    <Suspense fallback={<p>{strings.loading}</p>}>
                      <DevManipulatives />
                    </Suspense>
                  }
                />
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </LogoLongPressProvider>
      </ProgressProvider>
    </HashRouter>
  );
}
