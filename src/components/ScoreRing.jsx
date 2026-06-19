import { useEffect, useRef, useState } from 'react';
import './ScoreRing.css';

export default function ScoreRing({ targetScore = 78, label = 'Persuasiveness', size = 168 }) {
  const [score, setScore] = useState(0);
  const ringRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1400;
          const start = performance.now();
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setScore(Math.round(eased * targetScore));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [targetScore]);

  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="score-ring" ref={ringRef} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} score: ${score} out of 100`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--paper-sunken)"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--indigo-500)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="score-ring-arc"
        />
      </svg>
      <div className="score-ring-center">
        <span className="score-ring-number">{score}</span>
        <span className="score-ring-label">{label}</span>
      </div>
    </div>
  );
}
