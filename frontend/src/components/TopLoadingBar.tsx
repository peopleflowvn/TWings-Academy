import React, { useEffect, useState } from 'react';

const START_EVENT = 'twings:page-load-start';
const DONE_EVENT = 'twings:page-load-done';

/** Triggers the top loading bar animation to begin. */
export function startPageLoading(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(START_EVENT));
  }
}

/** Triggers the top loading bar to complete and fade out. */
export function donePageLoading(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DONE_EVENT));
  }
}

interface TopLoadingBarProps {
  /** If explicitly provided, overrides the event-based loading state. */
  active?: boolean;
}

export const TopLoadingBar: React.FC<TopLoadingBarProps> = ({ active }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      setVisible(true);
      setProgress(25);
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            if (interval) clearInterval(interval);
            return prev;
          }
          return prev + Math.floor(Math.random() * 12) + 5;
        });
      }, 200);
    };

    const done = () => {
      if (interval) clearInterval(interval);
      setProgress(100);
      timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 350);
    };

    if (active === true) {
      start();
    } else if (active === false) {
      done();
    } else {
      const handleStart = () => start();
      const handleDone = () => done();

      window.addEventListener(START_EVENT, handleStart);
      window.addEventListener(DONE_EVENT, handleDone);

      return () => {
        window.removeEventListener(START_EVENT, handleStart);
        window.removeEventListener(DONE_EVENT, handleDone);
        if (timer) clearTimeout(timer);
        if (interval) clearInterval(interval);
      };
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [active]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      <div
        className="h-[3px] bg-gradient-to-r from-[#00388A] via-[#0073C1] to-[#38BDF8] shadow-md shadow-[#0073C1]/50 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px rgba(0, 115, 193, 0.7), 0 0 4px rgba(56, 189, 248, 0.6)',
        }}
      />
    </div>
  );
};
