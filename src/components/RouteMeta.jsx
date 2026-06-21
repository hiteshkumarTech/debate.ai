import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'https://debateai-web.vercel.app';
const DEFAULT_DESC = 'Practice debating against an AI that argues every side. Pick a topic, choose your stance, and get scored on logic, evidence, clarity, and persuasiveness.';

const META = {
  '/': { title: 'DebateAI - Practice Debating Against AI', description: DEFAULT_DESC },
  '/explore': { title: 'Explore Public Debates - DebateAI', description: 'Browse real debates people practiced against AI. Filter by topic, sort by popularity, and read full transcripts.' },
  '/debate': { title: 'Start a Debate - DebateAI', description: 'Choose a topic, pick your side, and debate an AI opponent that pushes back - with instant scoring and feedback.' },
  '/how-it-works': { title: 'How It Works - DebateAI', description: 'See how DebateAI works: pick a topic and an AI persona, argue your case, and get scored feedback on your reasoning.' },
  '/leaderboard': { title: 'Leaderboard - DebateAI', description: 'See the top debaters on DebateAI, ranked across logic, evidence, clarity, and persuasiveness.' },
  '/about': { title: 'About - DebateAI', description: 'DebateAI sharpens critical thinking and communication by letting you debate an AI trained to argue every perspective.' },
  '/interview': { title: 'Interview Practice - DebateAI', description: 'Practice tough interview-style questions against an AI and get feedback on your answers.' },
  '/personas': { title: 'AI Opponents - DebateAI', description: 'Choose or create AI debate opponents with different intensities and argument styles.' },
  '/dashboard': { title: 'Dashboard - DebateAI', description: DEFAULT_DESC },
  '/progress': { title: 'Your Progress - DebateAI', description: DEFAULT_DESC },
  '/history': { title: 'Debate History - DebateAI', description: DEFAULT_DESC },
  '/achievements': { title: 'Achievements - DebateAI', description: DEFAULT_DESC },
};

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export default function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = META[pathname] || { title: 'DebateAI', description: DEFAULT_DESC };
    const url = SITE + (pathname === '/' ? '/' : pathname);
    document.title = meta.title;
    upsertMeta('name', 'description', meta.description);
    upsertLink('canonical', url);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'DebateAI');
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description);
  }, [pathname]);
  return null;
}