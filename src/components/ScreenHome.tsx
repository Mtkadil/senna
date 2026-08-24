import { useState } from 'react';
import { motion } from 'motion/react';
import { DollarSign, Eye } from 'lucide-react';
// @ts-expect-error - image import handled by vite
import logoImage from '../assets/images/zmegri_logo.png';

interface ScreenHomeProps {
  onNavigate: (screen: 'selection-screen' | 'admin-dashboard') => void;
}

export default function ScreenHome({ onNavigate }: ScreenHomeProps) {
  const [devClicks, setDevClicks] = useState(0);

  const handleLogoClick = () => {
    setDevClicks((prev) => prev + 1);
    if (devClicks + 1 >= 5) {
      onNavigate('admin-dashboard');
      setDevClicks(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -15 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full text-center"
    >
      <div className="flex justify-center mb-8">
        <motion.div 
          onClick={handleLogoClick}
          whileTap={{ scale: 0.95 }}
          className="relative p-2.5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_30px_rgba(215,180,60,0.1)] cursor-pointer active:bg-white/10 transition-colors"
        >
          <img
            src={logoImage}
            alt="Zmegri Logo"
            className="h-28 w-auto object-contain brightness-110 select-none pointer-events-none"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </div>

      <h2 className="font-serif text-2xl tracking-[0.2em] font-bold text-gold-primary mb-1 uppercase">
        Benvenuto
      </h2>
      <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-[#8E8E93] mb-12">
        Seleziona modulo operativo
      </p>

      <div className="space-y-4">
        <button
          onClick={() => onNavigate('selection-screen')}
          className="w-full bg-gradient-to-br from-[#D4AF37] via-[#FCF6BA] to-[#B38728] hover:brightness-110 active:scale-[0.98] transition-all text-black font-bold rounded-2xl py-5 flex items-center justify-center gap-2.5 shadow-lg shadow-amber-900/20 cursor-pointer text-base font-sans uppercase tracking-[1px]"
        >
          <DollarSign className="w-5 h-5 stroke-[2.5]" />
          Accedi alle Poltrone
        </button>
        
        {devClicks > 0 && (
          <p className="text-[9px] uppercase tracking-widest text-stone-600 animate-pulse">
            Sblocco Admin: {5 - devClicks} tocchi...
          </p>
        )}
      </div>
    </motion.div>
  );
}
