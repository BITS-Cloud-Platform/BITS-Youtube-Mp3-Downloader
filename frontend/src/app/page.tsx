'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Shield, Music, LogIn, UserPlus } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import Typewriter from '@/components/Typewriter';

const features = [
  { title: 'Bulk Download', desc: 'Download entire playlists with one click', icon: Download, delay: 'delay-700' },
  { title: 'Cookie Auth', desc: 'Access private and unlisted videos', icon: Shield, delay: 'delay-800' },
  { title: 'High Quality', desc: 'Audio encoded in high-bitrate M4A', icon: Music, delay: 'delay-900' },
];

export default function LandingPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <ParticleBackground />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div
          className={`transition-all duration-1000 ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-tight animate-pulse-slow hover:scale-105 transition-transform duration-700">
              YTMp3
              <span className="text-zinc-500">.in</span>
            </h1>
            <div className="h-8 md:h-10 flex items-center justify-center">
              {loaded && <Typewriter text="Download YouTube playlists to MP3. Fast, private, and supports unlisted videos with cookie auth." />}
            </div>
          </div>

          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-500 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <button
              onClick={() => router.push('/login')}
              className="group px-8 py-3 border border-zinc-700 text-zinc-300 font-semibold rounded-xl hover:bg-zinc-900 hover:border-zinc-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] transition-all duration-300 text-lg flex items-center gap-2"
            >
              <LogIn className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
              Masuk
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="group px-8 py-3 border border-zinc-700 text-zinc-300 font-semibold rounded-xl hover:bg-zinc-900 hover:border-zinc-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] transition-all duration-300 text-lg flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              Daftar
            </button>
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group p-5 border border-zinc-800 rounded-xl bg-zinc-900/50 transition-all duration-700 hover:scale-105 hover:border-zinc-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] flex items-center gap-4 ${
                  loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                } ${f.delay}`}
              >
                <div className="flex-shrink-0 text-zinc-400 group-hover:text-white transition-colors duration-300">
                  <f.icon className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{f.title}</h3>
                  <p className="text-zinc-500 text-xs group-hover:text-zinc-300 transition-colors duration-300">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            className={`mt-16 text-center transition-all duration-1000 delay-1000 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <p className="text-zinc-600 text-sm">
              Web Developed with <span className="text-red-400">&hearts;</span> by{' '}
              <a
                href="https://bits.co.id"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white underline underline-offset-2"
              >
                Banten IT Solutions
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
