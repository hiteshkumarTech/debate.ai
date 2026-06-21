import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { TOPIC_CATEGORIES } from '../data/topics';
import { PERSONALITIES } from '../data/personalities';
import './Explore.css';

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'popular', label: 'Most liked' },
  { id: 'top', label: 'Highest rated' },
  { id: 'trending', label: 'Trending' },
];

const CATEGORY_LABELS = ['All', ...TOPIC_CATEGORIES.map((c) => c.label), 'Other'];
const CATEGORY_ICON = Object.fromEntries(TOPIC_CATEGORIES.map((c) => [c.label, c.icon]));

function resultBadge(score) {
  if (score == null) return { label: 'Unscored', tone: 'mid' };
  if (score >= 75) return { label: 'Strong', tone: 'good' };
  if (score >= 50) return { label: 'Solid', tone: 'mid' };
  return { label: 'Practice', tone: 'low' };
}

function formatDate(iso) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Explore() {
  const { user } = useAuth();
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [likedIds, setLikedIds] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { sort };
      if (search) params.search = search;
      if (category && category !== 'All') params.category = category;
      const rows = await api.listPublicDebates(params);
      setDebates(Array.isArray(rows) ? rows : []);
    } catch {
      setError('Could not load the gallery. The server may be waking up - try again in a moment.');
      setDebates([]);
    } finally {
      setLoading(false);
    }
  }, [sort, search, category]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) { setLikedIds(new Set()); return; }
    let cancelled = false;
    (async () => {
      try {
        const ids = await api.myLikedDebates();
        if (!cancelled) setLikedIds(new Set(ids));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const submitSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const toggleLike = async (e, d) => {
    e.stopPropagation();
    if (!user) { setError('Sign in to like debates.'); return; }
    const wasLiked = likedIds.has(d.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(d.id); else next.add(d.id);
      return next;
    });
    setDebates((prev) => prev.map((x) => (x.id === d.id ? { ...x, likes_count: x.likes_count + (wasLiked ? -1 : 1) } : x)));
    try {
      const res = await api.togglePublicLike(d.id);
      setDebates((prev) => prev.map((x) => (x.id === d.id ? { ...x, likes_count: res.likes_count } : x)));
    } catch {
      load();
    }
  };

  const openDetail = async (d) => {
    setDetailLoading(true);
    setDetail(null);
    api.addPublicView(d.id).catch(() => {});
    setDebates((prev) => prev.map((x) => (x.id === d.id ? { ...x, views: x.views + 1 } : x)));
    try {
      const full = await api.getPublicDebate(d.id);
      setDetail(full);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setDetail(null); setDetailLoading(false); };

  return (
    <main className="explore-page">
      <div className="container">
        <header className="explore-head">
          <span className="explore-eyebrow">Explore</span>
          <h1 className="explore-title">Public debates</h1>
          <p className="explore-sub">Browse debates people chose to share. Like the ones you enjoy - and publish your own from the report screen after any debate.</p>
        </header>

        <form className="explore-search" onSubmit={submitSearch}>
          <input
            type="text"
            className="explore-search-input"
            placeholder="Search by topic..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="explore-search-btn">Search</button>
        </form>

        <div className="explore-chips">
          {CATEGORY_LABELS.map((c) => (
            <button
              key={c}
              type="button"
              className={`explore-chip ${category === c ? 'is-active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_ICON[c] ? `${CATEGORY_ICON[c]} ` : ''}{c}
            </button>
          ))}
        </div>

        <div className="explore-sorts">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`explore-sort ${sort === s.id ? 'is-active' : ''}`}
              onClick={() => setSort(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {error && <p className="explore-error">{error}</p>}

        {loading ? (
          <p className="explore-status">Loading debates...</p>
        ) : debates.length === 0 ? (
          <div className="explore-empty">
            <p>No public debates yet{search || category !== 'All' ? ' for this filter' : ''}.</p>
            <p className="explore-empty-hint">Finish a debate, open its report, and hit <strong>Publish to Explore</strong> to be the first.</p>
          </div>
        ) : (
          <div className="explore-grid">
            {debates.map((d) => {
              const persona = PERSONALITIES.find((p) => p.id === d.personality);
              const badge = resultBadge(d.score_overall);
              const liked = likedIds.has(d.id);
              return (
                <article
                  key={d.id}
                  className="explore-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(d)}
                  onKeyDown={(e) => { if (e.key === 'Enter') openDetail(d); }}
                >
                  <div className="explore-card-top">
                    <span className="explore-card-cat">{d.category ? `${CATEGORY_ICON[d.category] ? CATEGORY_ICON[d.category] + ' ' : ''}${d.category}` : 'Debate'}</span>
                    <span className={`explore-card-badge tone-${badge.tone}`}>{badge.label}</span>
                  </div>
                  <h3 className="explore-card-title">{d.title}</h3>
                  <div className="explore-card-vs">
                    <span>{d.author_name || 'Someone'}</span>
                    <span className="explore-card-vs-sep">vs</span>
                    <span>{persona ? `${persona.icon} ${persona.name}` : (d.ai_model || 'AI')}</span>
                  </div>
                  <div className="explore-card-foot">
                    {typeof d.score_overall === 'number' && (
                      <span className={`explore-card-score tone-${badge.tone}`}>{d.score_overall}%</span>
                    )}
                    <span className="explore-card-stat">{d.views} views</span>
                    <button
                      type="button"
                      className={`explore-card-like ${liked ? 'is-liked' : ''}`}
                      onClick={(e) => toggleLike(e, d)}
                      title={liked ? 'Unlike' : 'Like'}
                    >
                      {liked ? '\u2665' : '\u2661'} {d.likes_count}
                    </button>
                    <span className="explore-card-date">{formatDate(d.published_at)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {(detail || detailLoading) && (
        <div className="explore-modal-overlay" onClick={closeDetail}>
          <div className="explore-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="explore-modal-close" onClick={closeDetail} aria-label="Close">{'\u00d7'}</button>
            {detailLoading && <p className="explore-status">Loading transcript...</p>}
            {!detailLoading && !detail && <p className="explore-status">Couldn't load this debate.</p>}
            {!detailLoading && detail && (
              <>
                <div className="explore-modal-cat">{detail.category || 'Debate'}</div>
                <h2 className="explore-modal-title">{detail.title}</h2>
                <div className="explore-modal-meta">
                  <span>{detail.author_name || 'Someone'}</span>
                  {detail.side && <span>argued {detail.side === 'for' ? 'For' : 'Against'}</span>}
                  {detail.ai_model && <span>vs {detail.ai_model}</span>}
                  {typeof detail.score_overall === 'number' && <span>{detail.score_overall}%</span>}
                  <span>{detail.views} views</span>
                  <span>{detail.likes_count} likes</span>
                </div>
                <div className="explore-modal-transcript">
                  {detail.messages.length === 0 ? (
                    <p className="explore-status">No transcript saved.</p>
                  ) : (
                    detail.messages.map((m, i) => (
                      <div key={i} className={`explore-bubble-row ${m.sender === 'user' ? 'is-user' : ''}`}>
                        <div className="explore-bubble">{m.content}</div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}