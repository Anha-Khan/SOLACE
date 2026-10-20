export function EmotionCompanion({ mood }: { mood: number | null }) {
  const state = !mood ? "rest" : mood <= 3 ? "low" : mood <= 5 ? "anxious" : mood <= 7 ? "calm" : "joyful";
  return (
    <div className={`emotion-scene emotion-${state}`} aria-hidden="true">
      <svg viewBox="0 0 260 190" role="img">
        <path className="scene-ground" d="M27 154c49-21 157-22 207 1-40 23-164 24-207-1Z" />
        <path className="scene-stem stem-one" d="M38 142c2-27 9-52 22-73M48 110c-12-1-20-7-24-17M51 98c12-3 20-10 25-21" />
        <path className="scene-stem stem-two" d="M222 148c-1-25-7-44-18-61M214 117c10-2 18-8 22-17" />
        <path className="creature-tail" d="M166 113c28-10 41 3 34 18-5 11-20 8-21-2" />
        <path className="creature-body" d="M84 80c8-29 55-42 82-18 25 22 20 66-8 82-27 15-71 5-81-27-4-13-1-25 7-37Z" />
        <path className="creature-ear" d="M100 70 90 42c17 4 26 13 29 26M151 63l18-24c7 17 4 29-4 38" />
        <g className="creature-face">
          <path className="creature-eye eye-left" d="M111 98c3-3 7-3 10 0" />
          <path className="creature-eye eye-right" d="M142 96c3-3 7-3 10 0" />
          <path className="creature-mouth" d="M128 113c4 3 8 3 12 0" />
        </g>
        <path className="scene-leaf leaf-one" d="M25 91c17-5 25 3 21 18-14 3-22-3-21-18Z" />
        <path className="scene-leaf leaf-two" d="M212 87c13-7 23-2 23 12-12 6-21 2-23-12Z" />
      </svg>
    </div>
  );
}
