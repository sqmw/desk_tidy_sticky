<script>
  let {
    strings,
    variant = "workspace",
    imageSrc = "/feedback/qq-group.png",
  } = $props();
</script>

<section class="feedback-card" class:compact={variant === "compact"} class:workspace={variant === "workspace"}>
  <div class="feedback-copy">
    <div class="feedback-eyebrow">{strings.feedbackCommunityEyebrow}</div>
    <h4>{strings.feedbackCommunityTitle}</h4>
    <p>{strings.feedbackCommunityHint}</p>
    <div class="feedback-note">{strings.feedbackCommunityCaption}</div>
    {#if import.meta.env.DEV && strings.feedbackCommunityDevCaption}
      <div class="feedback-note dev-note">{strings.feedbackCommunityDevCaption}</div>
    {/if}
  </div>
  <div class="feedback-qr-wrap">
    <img class="feedback-qr" src={imageSrc} alt={strings.feedbackCommunityTitle} loading="lazy" />
  </div>
</section>

<style>
  .feedback-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 160px;
    gap: 16px;
    align-items: center;
    border-radius: 16px;
    overflow: hidden;
  }

  .feedback-card.workspace {
    padding: 16px;
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 82%, transparent);
    background:
      radial-gradient(circle at 100% 0, color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, transparent), transparent 42%),
      color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.96)) 88%, var(--ws-btn-bg, #fbfdff));
  }

  .feedback-card.compact {
    padding: 14px;
    border: 1px solid #e5e7eb;
    background:
      radial-gradient(circle at 100% 0, rgba(59, 130, 246, 0.12), transparent 42%),
      linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  }

  .feedback-copy {
    min-width: 0;
  }

  .feedback-eyebrow {
    margin-bottom: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .workspace .feedback-eyebrow {
    color: var(--ws-accent, #1d4ed8);
  }

  .compact .feedback-eyebrow {
    color: #2563eb;
  }

  .feedback-copy h4 {
    margin: 0 0 6px;
    font-size: 15px;
    line-height: 1.3;
  }

  .workspace .feedback-copy h4 {
    color: var(--ws-text-strong, #0f172a);
  }

  .compact .feedback-copy h4 {
    color: var(--neutral, #111827);
  }

  .feedback-copy p {
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
  }

  .workspace .feedback-copy p {
    color: var(--ws-text, #334155);
  }

  .compact .feedback-copy p {
    color: #4b5563;
  }

  .feedback-note {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.45;
  }

  .dev-note {
    opacity: 0.78;
  }

  .workspace .feedback-note {
    color: var(--ws-muted, #64748b);
  }

  .compact .feedback-note {
    color: #6b7280;
  }

  .feedback-qr-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    border-radius: 14px;
  }

  .workspace .feedback-qr-wrap {
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 92%, transparent);
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 72%, transparent);
  }

  .compact .feedback-qr-wrap {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid #e5e7eb;
  }

  .feedback-qr {
    display: block;
    width: 140px;
    height: 140px;
    object-fit: contain;
    border-radius: 10px;
    background: #fff;
  }

  @media (max-width: 680px) {
    .feedback-card {
      grid-template-columns: 1fr;
    }

    .feedback-qr-wrap {
      justify-content: flex-start;
    }
  }
</style>
