'use client';

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { prepareReviewVideo, submitReview } from '@/lib/feedback-actions';
import { cx } from '@/lib/css';
import { uploadSigned } from '@/lib/upload';
import { validateForm } from '@/lib/validate';
import { useCatalog } from '@/components/shell/CatalogProvider';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/components/ui/Link';
import { Spinner } from '@/components/ui/Spinner';
import { Stars } from '@/components/ui/Stars';

const MAX_VIDEO_MB = 50;
const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

interface Props {
  token?: string;
  name?: string;
  email?: string;
  orderNo?: string;
}

function StarPicker({ value, onChange, invalid }: { value: number; onChange: (n: number) => void; invalid?: boolean }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className={cx('field', invalid && 'invalid')}>
      <span className="field__label" id="ratingLabel">Your rating</span>
      <div className="star-pick" role="radiogroup" aria-labelledby="ratingLabel" onPointerLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}, ${RATING_WORDS[n]}`}
            className={cx('star-pick__star', n <= shown && 'on')}
            onPointerEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            onKeyDown={e => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(5, (value || 0) + 1)); }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(1, (value || 1) - 1)); }
            }}
            tabIndex={value ? (value === n ? 0 : -1) : n === 1 ? 0 : -1}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" /></svg>
          </button>
        ))}
        <span className="star-pick__word" aria-hidden="true">{RATING_WORDS[shown] || 'Tap a star'}</span>
      </div>
      <span className="err">Choose a star rating.</span>
    </div>
  );
}

/** Write a review: first name, email, stars, a few words and an optional video. */
export function ReviewForm({ token, name = '', email = '', orderNo }: Props) {
  const { supabase } = useCatalog();
  const [rating, setRating] = useState(0);
  const [video, setVideo] = useState<{ file: File; url: string } | null>(null);
  const [videoError, setVideoError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [invalid, setInvalid] = useState<Set<string> | null>(null);
  const [ratingMissing, setRatingMissing] = useState(false);
  const [stage, setStage] = useState<'' | 'video' | 'saving'>('');
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ name: string; rating: number } | null>(null);
  const [chars, setChars] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (video) URL.revokeObjectURL(video.url); }, [video]);

  const takeVideo = (file: File | undefined) => {
    if (!file) return;
    const ok = /^video\//.test(file.type) || /\.(mp4|mov|webm|m4v|3gp)$/i.test(file.name);
    if (!ok) { setVideoError('That file is not a video. Choose an MP4, MOV or WebM video.'); return; }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) { setVideoError(`That video is larger than ${MAX_VIDEO_MB} MB. Record a shorter clip, up to about a minute.`); return; }
    setVideoError('');
    setVideo({ file, url: URL.createObjectURL(file) });
  };
  const onDrag = (e: DragEvent, over: boolean) => { e.preventDefault(); setDragging(over); };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (stage) return;
    const form = e.currentTarget;
    const bad = validateForm(form);
    setInvalid(bad);
    setRatingMissing(!rating);
    if (bad.size || !rating) return;
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) ?? '').trim();
    if (get('body').length < 3 && !video) {
      setError('Write a few words about your experience, or add a video.');
      return;
    }
    setError('');

    let videoPath: string | undefined;
    if (video) {
      setStage('video');
      try {
        if (!supabase) throw new Error('Video uploads are not available right now. Remove the video to send your review.');
        const link = await prepareReviewVideo({ name: video.file.name, type: video.file.type, size: video.file.size });
        if (!link.ok) throw new Error(link.error);
        await uploadSigned(supabase, 'review-videos', link.path, link.token, video.file, link.contentType);
        videoPath = link.path;
      } catch (err) {
        setVideoError(err instanceof Error && err.message ? err.message : 'The video did not upload. Check your connection and try again.');
        setStage('');
        return;
      }
    }

    setStage('saving');
    const res = await submitReview({ firstName: get('firstName'), email: get('email'), rating, body: get('body'), videoPath, token, website: get('website') })
      .catch(() => ({ ok: false as const, error: 'We could not reach the shop. Check your connection and try again.' }));
    setStage('');
    if (!res.ok) { setError(res.error); return; }
    setDone({ name: get('firstName'), rating });
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (done) {
    return (
      <div className="sent-card review-done" ref={top} role="status">
        <span className="sent-card__mark"><Icon name="check" /></span>
        <Stars rating={done.rating} className="review-stars--lg" />
        <h2 className="h3">Thank you, {done.name}!</h2>
        <p>Your review means a lot to us and helps other people choose their glasses with confidence.</p>
        <div className="hero__ctas mt-6">
          <Link className="btn" href="/shop">Browse frames</Link>
          <Link className="btn btn--ghost" href="/">Back to home</Link>
        </div>
      </div>
    );
  }

  const busy = !!stage;
  return (
    <div ref={top}>
      <form className="form review-form" noValidate onSubmit={submit}>
        {orderNo && <p className="review-form__order"><Icon name="receipt" />Reviewing order <b>{orderNo}</b></p>}
        <div className="form__row">
          <Field id="rName" name="firstName" label="First name" autoComplete="given-name" required defaultValue={name}
            error="Enter your first name." invalid={invalid?.has('rName')} maxLength={60} />
          <Field id="rEmail" name="email" label="Email" type="email" autoComplete="email" required defaultValue={email}
            error="Enter a valid email address." invalid={invalid?.has('rEmail')} placeholder="Not shown publicly" />
        </div>

        <StarPicker value={rating} onChange={n => { setRating(n); setRatingMissing(false); }} invalid={ratingMissing} />

        <div className="field">
          <label htmlFor="rBody">Your review</label>
          <textarea id="rBody" name="body" maxLength={2000} rows={5} onChange={e => setChars(e.target.value.length)}
            placeholder="How was the fit, the lenses and our service? Would you recommend us?" />
          <span className="field__hint tnum">{chars}/2000</span>
        </div>

        <div className="field">
          <span className="field__label">Video review <small>(optional)</small></span>
          {video ? (
            <div className="video-pick">
              <video src={video.url} controls playsInline preload="metadata" />
              <div className="video-pick__meta">
                <b>{video.file.name}</b>
                <span>{(video.file.size / 1024 / 1024).toFixed(1)} MB, ready to upload</span>
                <button className="btn btn--sm btn--ghost" type="button" disabled={busy} onClick={() => setVideo(null)}>Remove video</button>
              </div>
            </div>
          ) : (
            <label
              className={cx('drop', dragging && 'drag')}
              onDragEnter={e => onDrag(e, true)}
              onDragOver={e => onDrag(e, true)}
              onDragLeave={e => onDrag(e, false)}
              onDrop={e => { onDrag(e, false); takeVideo(e.dataTransfer.files[0]); }}
            >
              <Icon name="camera" />
              <b>Add a short video of you wearing your glasses</b>
              <small>MP4, MOV or WebM, up to {MAX_VIDEO_MB} MB. Record one now on your phone or choose a saved clip.</small>
              <input type="file" accept="video/*" aria-label="Add a video review" onChange={e => takeVideo(e.target.files?.[0])} />
            </label>
          )}
          {videoError && <p className="alert" role="alert"><Icon name="info" /><span>{videoError}</span></p>}
        </div>

        <div className="hp" aria-hidden="true">
          <label htmlFor="rSite">Website</label>
          <input id="rSite" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        {error && <p className="alert" role="alert"><Icon name="info" /><span>{error}</span></p>}

        <button className={cx('btn btn--block', busy && 'is-busy')} type="submit" disabled={busy} aria-disabled={busy}>
          {stage === 'video' ? <><Spinner label="Uploading your video" />Uploading your video…</>
            : stage === 'saving' ? <><Spinner label="Sending your review" />Sending your review…</>
              : <>Submit review<Icon name="chevRight" /></>}
        </button>
        <p className="review-form__note">Your first name, rating, review and video may be shown on our website. Your email is never shown.</p>
      </form>
    </div>
  );
}
