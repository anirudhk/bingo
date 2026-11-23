import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface CelebrationParticlesProps {
  show: boolean;
  onComplete?: () => void;
  intensity?: 'low' | 'medium' | 'high';
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const CelebrationParticles: React.FC<CelebrationParticlesProps> = ({
  show,
  onComplete,
  intensity = 'medium',
}) => {
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const [isActive, setIsActive] = useState(false);
  // Pauses confetti when the tab is hidden — prevents background CPU/battery drain.
  const [isVisible, setIsVisible] = useState(
    typeof document === 'undefined' ? true : !document.hidden
  );

  useEffect(() => {
    const updateWindowDimensions = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    const onVisibilityChange = () => setIsVisible(!document.hidden);

    window.addEventListener('resize', updateWindowDimensions);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('resize', updateWindowDimensions);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!show) return;

    // Honour the user's reduced-motion preference: skip confetti entirely but
    // still fire onComplete so the caller's state machine progresses.
    if (prefersReducedMotion()) {
      onComplete?.();
      return;
    }

    setIsActive(true);
    const timer = setTimeout(() => {
      setIsActive(false);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [show, onComplete]);

  if (!isActive) {
    return null;
  }

  const getIntensitySettings = () => {
    switch (intensity) {
      case 'low':
        return {
          numberOfPieces: 50,
          gravity: 0.1,
          wind: 0.01,
          opacity: 0.7,
        };
      case 'high':
        return {
          numberOfPieces: 200,
          gravity: 0.3,
          wind: 0.03,
          opacity: 0.9,
        };
      default: // medium
        return {
          numberOfPieces: 100,
          gravity: 0.2,
          wind: 0.02,
          opacity: 0.8,
        };
    }
  };

  const settings = getIntensitySettings();

  return (
    <Confetti
      width={windowDimensions.width}
      height={windowDimensions.height}
      numberOfPieces={settings.numberOfPieces}
      gravity={settings.gravity}
      wind={settings.wind}
      opacity={settings.opacity}
      colors={[
        '#ff6b6b',
        '#4ecdc4',
        '#45b7d1',
        '#96ceb4',
        '#fdd835',
        '#ff8a65',
        '#ba68c8',
        '#4fc3f7',
      ]}
      recycle={false}
      run={isActive && isVisible}
    />
  );
};
