import React, { useEffect, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeroVideoProps {
  videoSrc: string;
  poster?: string;
  heading: React.ReactNode;
  subheading?: string;
  primaryCta?: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  className?: string;
  overlay?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
}

const HeroVideo: React.FC<HeroVideoProps> = ({
  videoSrc,
  poster,
  heading,
  subheading,
  primaryCta,
  secondaryCta,
  className = '',
  overlay = true,
  autoPlay = true,
  loop = true,
}: HeroVideoProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [usePosterOnly, setUsePosterOnly] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) setUsePosterOnly(true);
    const listener = () => setUsePosterOnly(reduce.matches);
    reduce.addEventListener('change', listener);
    return () => reduce.removeEventListener('change', listener);
  }, []);

  const onCanPlay = () => setIsLoaded(true);
  const onError = () => setUsePosterOnly(true);

  return (
    <section className={`relative h-[640px] w-full flex items-center justify-center overflow-hidden ${className}`}>
      {!usePosterOnly && (
        <video
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          src={videoSrc}
          poster={poster}
          playsInline
          muted
          autoPlay={autoPlay}
          loop={loop}
          onCanPlay={onCanPlay}
          onError={onError}
        />
      )}
      {(usePosterOnly || !isLoaded) && poster && (
        <img
          src={poster}
          alt="Microscopy cells background"
          className={`absolute inset-0 w-full h-full object-cover ${isLoaded && !usePosterOnly ? 'opacity-0' : 'opacity-100'} transition-opacity duration-700`}
          loading="eager"
        />
      )}
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-teal-900/40 mix-blend-multiply" />
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white">
        <h1 className="font-extrabold tracking-tight text-4xl md:text-6xl leading-tight drop-shadow-lg">
          {heading}
        </h1>
        {subheading && (
          <p className="mt-6 text-lg md:text-2xl text-slate-100/90 max-w-3xl mx-auto leading-relaxed font-light">
            {subheading}
          </p>
        )}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          {primaryCta && (
            <Link
              to={primaryCta.to}
              className="inline-flex items-center px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300"
            >
              {primaryCta.label}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          )}
          {secondaryCta && (
            <Link
              to={secondaryCta.to}
              className="inline-flex items-center px-8 py-4 border-2 border-white/60 hover:border-white text-white/90 hover:text-white text-lg font-semibold rounded-lg transition-all duration-200 backdrop-blur-sm bg-white/5"
            >
              {secondaryCta.label}
            </Link>
          )}
        </div>
        {!isLoaded && !usePosterOnly && (
          <div className="mt-6 inline-flex items-center text-xs uppercase tracking-widest text-white/60 animate-pulse">
            <Play className="h-4 w-4 mr-1" /> Loading video…
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle_at_center,white,transparent)] opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>
    </section>
  );
};

export default HeroVideo;
