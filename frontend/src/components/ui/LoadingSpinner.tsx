import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// ─── Paleta institucional IUDC ───────────────────────────────────────────────
const UC_YELLOW = '#FFCC00';
const UC_RED = '#D72828';
const UC_BLUE = '#1A2340';
const UC_WHITE = '#FFFFFF';
// ─────────────────────────────────────────────────────────────────────────────

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Cargando...',
  fullScreen = true,
}) => {
  return (
    <>
      {/* ── Estilos responsivos via CSS ─────────────────────────────── */}
      <style>{`
        /* ── Variables responsivas ── */
        .iudc-spinner-root {
          --logo-size:  clamp(56px, 12vw, 96px);
          --ring-size:  clamp(100px, 21vw, 168px);
          --ring2-size: clamp(80px,  17vw, 136px);
          --dot-size:   clamp(5px,   1.2vw, 8px);
          --font-msg:   clamp(0.8rem, 2vw, 0.95rem);
          --font-label: clamp(0.55rem, 1.4vw, 0.65rem);
          --bar-width:  clamp(130px, 35vw, 180px);
          --gap-sm:     clamp(4px, 1.5vw, 8px);
        }

        /* ── Layout del root ── */
        .iudc-spinner-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: clamp(20px, 5vw, 32px);
          padding: clamp(16px, 4vw, 40px);
          box-sizing: border-box;
          width: 100%;
        }
        .iudc-spinner-root.fullscreen {
          min-height: 100dvh;   /* dynamic viewport height — mejor en móvil */
          background: ${UC_BLUE};
        }
        .iudc-spinner-root.inline {
          padding: clamp(32px, 8vw, 64px) 0;
          background: transparent;
        }

        /* ── Zona orbital ── */
        .iudc-orbit-wrap {
          position: relative;
          width:  var(--ring-size);
          height: var(--ring-size);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Anillos */
        .iudc-ring-outer,
        .iudc-ring-inner {
          position: absolute;
          border-radius: 50%;
        }
        .iudc-ring-outer {
          width:  var(--ring-size);
          height: var(--ring-size);
          border: clamp(2px, 0.5vw, 3.5px) solid ${UC_YELLOW}30;
          border-top-color:   ${UC_YELLOW};
          border-right-color: ${UC_YELLOW};
          animation: iudc-spin 1.4s linear infinite;
        }
        .iudc-ring-inner {
          width:  var(--ring2-size);
          height: var(--ring2-size);
          border: clamp(1.5px, 0.4vw, 2.5px) solid ${UC_RED}25;
          border-bottom-color: ${UC_RED};
          border-left-color:   ${UC_RED};
          animation: iudc-spin 2s linear infinite reverse;
        }

        /* Puntos orbitales */
        .iudc-orbit-dot-track {
          position: absolute;
          width:  var(--ring-size);
          height: var(--ring-size);
          border-radius: 50%;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          animation: iudc-spin 1.4s linear infinite;
        }
        .iudc-orbit-dot {
          width:  var(--dot-size);
          height: var(--dot-size);
          margin-top: calc(var(--dot-size) * -0.5);
          border-radius: 50%;
          animation: iudc-pop 1.4s ease-in-out infinite;
        }

        /* Logo */
        .iudc-logo-wrap {
          width:  var(--logo-size);
          height: var(--logo-size);
          border-radius: 50%;
          background: ${UC_WHITE};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 0 0 clamp(3px, 0.8vw, 5px) ${UC_YELLOW}40,
            0 0 clamp(16px, 4vw, 28px) ${UC_YELLOW}28,
            0 clamp(3px, 1vw, 6px) clamp(12px, 3vw, 20px) rgba(0,0,0,0.45);
          animation: iudc-pulse 2.4s ease-in-out infinite;
          overflow: hidden;
          padding: clamp(4px, 1vw, 7px);
          flex-shrink: 0;
        }
        .iudc-logo-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          user-select: none;
          pointer-events: none;
          display: block;
        }

        /* ── Nombre institucional ── */
        .iudc-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(4px, 1vw, 8px);
          text-align: center;
        }
        .iudc-brand-row {
          display: flex;
          align-items: center;
          gap: clamp(6px, 2vw, 10px);
        }
        .iudc-brand-line {
          height: 1.5px;
          width: clamp(18px, 5vw, 30px);
          flex-shrink: 0;
        }
        .iudc-brand-name {
          color: ${UC_YELLOW};
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-weight: 700;
          font-size: var(--font-label);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .iudc-brand-sub {
          color: ${UC_WHITE}55;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-weight: 400;
          font-size: calc(var(--font-label) * 0.9);
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        /* ── Mensaje + barra + puntos ── */
        .iudc-msg-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(8px, 2vw, 12px);
        }
        .iudc-msg-text {
          color: ${UC_WHITE};
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: var(--font-msg);
          font-weight: 600;
          letter-spacing: 0.02em;
          animation: iudc-pulse 2s ease-in-out infinite;
          text-align: center;
        }
        .iudc-bar-track {
          width: var(--bar-width);
          height: clamp(2px, 0.5vw, 3px);
          background: ${UC_WHITE}10;
          border-radius: 9999px;
          overflow: hidden;
          position: relative;
        }
        .iudc-bar-fill {
          position: absolute;
          top: 0; left: -50%;
          width: 45%;
          height: 100%;
          background: linear-gradient(90deg, ${UC_RED}, ${UC_YELLOW});
          border-radius: 9999px;
          animation: iudc-slide 1.6s ease-in-out infinite;
        }
        .iudc-dots {
          display: flex;
          gap: var(--gap-sm);
          align-items: center;
        }
        .iudc-dot {
          border-radius: 50%;
          opacity: 0.35;
          animation: iudc-dot 1.4s ease-in-out infinite;
          flex-shrink: 0;
        }

        /* ── Keyframes ── */
        @keyframes iudc-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes iudc-pulse {
          0%, 100% { opacity: 1;    transform: scale(1);    }
          50%       { opacity: 0.78; transform: scale(0.96); }
        }
        @keyframes iudc-pop {
          0%, 100% { transform: scale(0.55); opacity: 0.2; }
          50%       { transform: scale(1.4);  opacity: 1;   }
        }
        @keyframes iudc-slide {
          0%   { left: -50%; }
          100% { left: 110%; }
        }
        @keyframes iudc-dot {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.2; }
          40%           { transform: scale(1.35); opacity: 1;  }
        }

        /* ── Ajustes para pantallas muy pequeñas (<360px) ── */
        @media (max-width: 360px) {
          .iudc-brand-name { letter-spacing: 0.1em; }
          .iudc-brand-sub  { display: none; }
        }
      `}</style>

      <div className={`iudc-spinner-root ${fullScreen ? 'fullscreen' : 'inline'}`}>

        {/* ── Anillos orbitales + logo ───────────────────────────── */}
        <div className="iudc-orbit-wrap">

          {/* Anillo exterior — amarillo */}
          <div className="iudc-ring-outer" />

          {/* Anillo interior — rojo */}
          <div className="iudc-ring-inner" />

          {/* 5 puntos orbitales */}
          {[0, 72, 144, 216, 288].map((deg, i) => (
            <div
              key={i}
              className="iudc-orbit-dot-track"
              style={{ transform: `rotate(${deg}deg)`, animationDelay: `${i * -0.28}s` }}
            >
              <div
                className="iudc-orbit-dot"
                style={{
                  background: i % 2 === 0 ? UC_YELLOW : UC_RED,
                  opacity: 0.3 + i * 0.12,
                  animationDelay: `${i * 0.28}s`,
                }}
              />
            </div>
          ))}

          {/* Logo IUDC */}
          <div className="iudc-logo-wrap">
            <img src="/iudc-icon.png" alt="Universitaria de Colombia" />
          </div>
        </div>

        {/* ── Nombre institucional ───────────────────────────────── */}
        <div className="iudc-brand">
          <div className="iudc-brand-row">
            <div
              className="iudc-brand-line"
              style={{ background: `linear-gradient(90deg, transparent, ${UC_YELLOW})` }}
            />
            <span className="iudc-brand-name">Universitaria de Colombia</span>
            <div
              className="iudc-brand-line"
              style={{ background: `linear-gradient(90deg, ${UC_YELLOW}, transparent)` }}
            />
          </div>
          <span className="iudc-brand-sub">Sistema de Gestión de Calidad</span>
        </div>

        {/* ── Mensaje + barra + puntos ───────────────────────────── */}
        {message && (
          <div className="iudc-msg-block">
            <span className="iudc-msg-text">{message}</span>

            {/* Barra progreso */}
            <div className="iudc-bar-track">
              <div className="iudc-bar-fill" />
            </div>

            {/* Puntos bouncing */}
            <div className="iudc-dots">
              {[
                { color: UC_RED, big: false },
                { color: UC_YELLOW, big: false },
                { color: UC_WHITE, big: true },
                { color: UC_YELLOW, big: false },
                { color: UC_RED, big: false },
              ].map(({ color, big }, i) => (
                <div
                  key={i}
                  className="iudc-dot"
                  style={{
                    width: big ? 'clamp(7px, 1.8vw, 9px)' : 'clamp(4px, 1vw, 5px)',
                    height: big ? 'clamp(7px, 1.8vw, 9px)' : 'clamp(4px, 1vw, 5px)',
                    background: color,
                    animationDelay: `${i * 0.14}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LoadingSpinner;
