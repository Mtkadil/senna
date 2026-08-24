import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Delete, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';
// @ts-expect-error - image import handled by vite
import logoImage from '../assets/images/senna_barbershop_logo_1787613248874.jpg';
import { CHAIR_NAMES_MAP } from '../types';

interface ScreenLoginProps {
  onLoginSuccess: (role: 'owner' | 'barber', chairNum?: number) => void;
  pinsData: {
    owner: string;
    chair1: string;
    chair2: string;
    chair3: string;
    chair4: string;
  };
  barberNames: {
    chair1: string;
    chair2: string;
    chair3: string;
    chair4: string;
  };
}

export default function ScreenLogin({ onLoginSuccess, pinsData, barberNames }: ScreenLoginProps) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showHelper, setShowHelper] = useState(false);
  const [isSuccessRef, setIsSuccessRef] = useState(false);

  // Correct PINs loaded dynamically from custom Firebase settings
  const PINS_MAP: { [key: string]: { role: 'owner' | 'barber'; chairNum?: number; name: string } } = {
    [pinsData.owner]: { role: 'owner', name: 'Proprietario' },
  };

  // Dynamically add all chairs from pinsData
  Object.keys(pinsData).forEach((key) => {
    if (key.startsWith('chair')) {
      const chairNum = parseInt(key.replace('chair', ''), 10);
      PINS_MAP[pinsData[key]] = {
        role: 'barber',
        chairNum,
        name: barberNames[key] || `Barbiere ${chairNum}`
      };
    }
  });

  const handleKeyPress = (num: string) => {
    if (isSuccessRef) return;
    setErrorMsg('');
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (isSuccessRef) return;
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isSuccessRef) return;
    setErrorMsg('');
    setPin('');
  };

  // Auto-validate PIN when length gets to 4
  useEffect(() => {
    if (pin.length === 4) {
      const match = PINS_MAP[pin];
      if (match) {
        setIsSuccessRef(true);
        setErrorMsg('');
        
        // Timeout to show elegant feedback transition before unlocking
        const timer = setTimeout(() => {
          onLoginSuccess(match.role, match.chairNum);
        }, 800);
        return () => clearTimeout(timer);
      } else {
        // Vibrate/Shake screen by triggering local feedback and empty input
        setErrorMsg('PIN Errato! Riprova.');
        
        const errorTimer = setTimeout(() => {
          setPin('');
        }, 600);
        return () => clearTimeout(errorTimer);
      }
    }
  }, [pin]);

  // Support keyboard entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSuccessRef) return;
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isSuccessRef]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -15 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full text-center flex flex-col justify-between min-h-[500px]"
    >
      {/* Header, Logo */}
      <div>
        <div className="flex justify-center mb-6">
          <div className="relative p-2.5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_30px_rgba(215,180,60,0.1)]">
            <img
              src={logoImage}
              alt="Senna Barbershop"
              className="h-24 w-auto object-contain rounded-2xl brightness-105 select-none pointer-events-none"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <h2 className="font-serif text-lg tracking-[0.15em] font-bold text-gold-primary mb-1 uppercase flex items-center justify-center gap-1.5">
          <Lock className="w-4 h-4" />
          ACCESSO CASSA
        </h2>
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-[#8E8E93] mb-6">
          Inserisci il tuo PIN di 4 cifre
        </p>
      </div>

      {/* PIN Dots indicators with status states */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="flex gap-4 justify-center items-center mb-3 min-h-[30px]">
          {[0, 1, 2, 3].map((index) => {
            const hasValue = pin.length > index;
            return (
              <motion.div
                key={index}
                animate={
                  errorMsg 
                    ? { x: [0, -6, 6, -6, 6, 0] } 
                    : isSuccessRef 
                    ? { scale: [1, 1.2, 1] } 
                    : {}
                }
                transition={{ duration: errorMsg ? 0.4 : 0.2 }}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  isSuccessRef
                    ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    : errorMsg
                    ? 'bg-red-500 border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                    : hasValue
                    ? 'bg-gold-primary border-gold-light shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                    : 'bg-transparent border-white/20'
                }`}
              />
            );
          })}
        </div>

        {/* Feedback Messages */}
        <div className="h-6">
          <AnimatePresence mode="wait">
            {errorMsg ? (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-xs text-red-400 font-sans flex items-center gap-1 font-semibold"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMsg}
              </motion.p>
            ) : isSuccessRef ? (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-emerald-400 font-sans flex items-center gap-1 font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                PIN Corretto! Accesso in corso...
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Numeric PIN Pad Grid */}
      <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mb-6">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(num)}
            disabled={isSuccessRef}
            className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/5 text-stone-100 text-xl font-semibold flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 duration-100"
          >
            {num}
          </button>
        ))}
        {/* Cancel/Clear Button */}
        <button
          type="button"
          onClick={handleClear}
          disabled={isSuccessRef}
          className="w-16 h-16 rounded-full text-[10px] uppercase tracking-widest text-[#8E8E93] hover:text-[#F2F2F7] flex items-center justify-center transition-all cursor-pointer select-none"
        >
          Canc
        </button>
        {/* Zero */}
        <button
          type="button"
          onClick={() => handleKeyPress('0')}
          disabled={isSuccessRef}
          className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/5 text-stone-100 text-xl font-semibold flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 duration-100"
        >
          0
        </button>
        {/* Backspace Delete */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSuccessRef}
          className="w-16 h-16 rounded-full hover:bg-white/5 active:bg-white/10 text-[#8E8E93] hover:text-[#F2F2F7] flex items-center justify-center transition-all cursor-pointer select-none"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

    </motion.div>
  );
}
