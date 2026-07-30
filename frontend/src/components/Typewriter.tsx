'use client';

import { useState, useEffect } from 'react';

export default function Typewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className="text-lg md:text-xl text-zinc-400">
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}
