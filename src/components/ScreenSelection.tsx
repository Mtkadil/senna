import { motion } from 'motion/react';
import { ArrowLeft, Scissors } from 'lucide-react';
import { CHAIR_NAMES_MAP } from '../types';
// @ts-expect-error - image import handled by vite
import logoImage from '../assets/images/senna_barbershop_logo_1787613248874.jpg';

interface ScreenSelectionProps {
  barberNames: { [key: string]: string };
  onSelectChair: (chairNum: number) => void;
  isAdminMode?: boolean;
  onBack: () => void;
}

export default function ScreenSelection({ barberNames, onSelectChair, isAdminMode = false, onBack }: ScreenSelectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -15 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full text-center animate-fade-in"
    >
      <div className="flex justify-center mb-4">
        <img
          src={logoImage}
          alt="Senna Barbershop"
          className="h-20 w-auto object-contain rounded-2xl brightness-105 filter hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
        />
      </div>

      <h2 className="font-sans text-[10px] tracking-[0.25em] uppercase text-stone-400 mb-8 font-bold">
        Seleziona postazione di lavoro
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {Object.entries(barberNames)
          .filter(([key]) => key.startsWith('chair'))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, name]) => {
            const num = parseInt(key.replace('chair', ''), 10);
            return (
              <button
                key={key}
                onClick={() => onSelectChair(num)}
                className="w-full bg-[#0E0E10] hover:bg-[#121215] border border-white/5 hover:border-gold-primary/30 text-stone-200 hover:text-white rounded-2xl py-5 px-6 flex items-center justify-between transition-all duration-300 group cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.08)] active:scale-[0.98] text-left relative overflow-hidden"
              >
                {/* Accent border highlight on group hover */}
                <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-gold-primary transition-all duration-300" />
                
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-black/60 border border-white/5 group-hover:border-gold-primary/20 group-hover:bg-black/80 transition-all duration-300 flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-gold-primary group-hover:rotate-12 transition-transform duration-300" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-[#8E8E93] font-mono block mb-0.5">Postazione 0{num}</span>
                    <p className="font-serif text-lg text-stone-100 font-semibold group-hover:text-gold-primary transition-colors duration-300 leading-tight">{name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 group-hover:bg-gold-primary/10 px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-widest uppercase text-stone-500 group-hover:text-gold-primary transition-all duration-300">
                  <span>Scegli</span>
                  <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform duration-300">&rarr;</span>
                </div>
              </button>
            );
          })}
      </div>

      {isAdminMode ? (
        <button
          onClick={onBack}
          className="text-[#8E8E93] hover:text-gold-primary text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer font-sans"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla Home
        </button>
      ) : (
        <div className="text-[9px] uppercase tracking-[0.25em] text-[#8E8E93]/50">
          Terminale Operatori &bull; Connesso alla Cassa
        </div>
      )}
    </motion.div>
  );
}
