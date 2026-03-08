'use client';

import { useState, useEffect } from 'react';
import { soundManager } from '../lib/sounds';

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    soundManager.init();
    setEnabled(soundManager.isEnabled);
  }, []);

  const toggle = () => {
    const newState = soundManager.toggle();
    setEnabled(newState);
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-lg cursor-pointer"
      title={enabled ? 'Mute sounds' : 'Enable sounds'}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
}
