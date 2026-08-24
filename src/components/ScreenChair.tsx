import { useState, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, RotateCcw } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';
import { CHAIR_NAMES_MAP, ServicePrice } from '../types';

interface ScreenChairProps {
  chairNum: number;
  barberNames: { [key: string]: string };
  prices: ServicePrice[];
  total: number;
  history?: Array<{ id: string; amount: number; timestamp: string }>;
  onAddAmount: (amount: number) => Promise<void>;
  onUndoRecentTransaction?: () => Promise<void>;
  onExit: () => void;
  isAdminMode?: boolean;
}

export default function ScreenChair({
  chairNum,
  barberNames,
  prices,
  total,
  history = [],
  onAddAmount,
  onUndoRecentTransaction,
  onExit,
  isAdminMode = false
}: ScreenChairProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [triggerCountEffect, setTriggerCountEffect] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [buttonSize, setButtonSize] = useState<'sm' | 'md' | 'lg'>('md');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUndoConfirm = async () => {
    if (onUndoRecentTransaction) {
      setIsUndoing(true);
      setSaveError('');
      try {
        await onUndoRecentTransaction();
      } catch (err) {
        console.error('Errore durante l\'annullamento:', err);
        setSaveError("Impossibile annullare l'operazione. Verifica la connessione.");
      } finally {
        setIsUndoing(false);
        setShowUndoConfirm(false);
      }
    }
  };

  const recentTransaction = history.length > 0 ? history[0] : null;
  const recentTransactionTime = recentTransaction
    ? new Date(recentTransaction.timestamp).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';

  const handleQuickAdd = async (amount: number) => {
    if (isSaving) return;
    setSaveError('');
    setIsSaving(true);
    setTriggerCountEffect(true);
    setTimeout(() => setTriggerCountEffect(false), 200);
    try {
      await onAddAmount(amount);
    } catch (err) {
      console.error('Errore durante il salvataggio rapido:', err);
      setSaveError("Connessione instabile. Riprova a premere il bottone.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setSaveError('');
    const amount = parseFloat(customAmount);
    if (!isNaN(amount) && amount > 0) {
      setIsSaving(true);
      setTriggerCountEffect(true);
      setTimeout(() => setTriggerCountEffect(false), 200);
      try {
        await onAddAmount(amount);
        setCustomAmount('');
        if (inputRef.current) {
          inputRef.current.blur(); // Closes software keyboard on mobile
        }
      } catch (err) {
        console.error('Errore durante il salvataggio custom:', err);
        setSaveError("Connessione instabile. Riprova a premere il bottone.");
      } finally {
        setIsSaving(false);
      }
    } else {
      setSaveError("Inserisci una cifra valida superiore a 0.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -15 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full text-center max-w-xl mx-auto"
    >
      <div className="mb-6">
        <h2 className="font-sans text-[10px] uppercase tracking-[0.25em] text-stone-400 mb-0.5">
          Operatore
        </h2>
        <p className="font-serif text-2xl font-bold tracking-[2px] text-gold-primary uppercase">
          {barberNames[`chair${chairNum}`]}
        </p>
      </div>

      {/* Premium Glass Counter Dashboard Panel */}
      <div className="bg-[#0E0E10] border border-white/5 rounded-3xl p-6 mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[100px] bg-gradient-to-b from-gold-primary/5 to-transparent pointer-events-none" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E93] font-bold block mb-1">
          Totale Incassato Oggi
        </span>
        
        <motion.div
          animate={{ scale: triggerCountEffect ? 1.05 : 1 }}
          transition={{ duration: 0.15, ease: 'easeInOut' }}
          className="text-5xl sm:text-6xl font-light tracking-tighter text-white tabular-nums flex items-center justify-center my-2"
        >
          <span className="text-xl sm:text-2xl align-top mr-1 text-gold-primary/60 font-sans">€</span>
          <AnimatedCounter value={total} />
        </motion.div>

        <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-full px-3 py-1 text-[9px] text-stone-400 font-mono uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Postazione attiva 0{chairNum} &bull; Sicura
        </div>
      </div>

      {/* QUICK FAST ADD BUTTONS BOX PANEL */}
      <div className="bg-[#0E0E10] border border-white/5 rounded-3xl p-5 mb-5 shadow-lg text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 pl-1">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E93] font-bold">
            Servizi Rapidi
          </h3>
          
          {/* Sizing Controller panel */}
          <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-xl p-1 self-start sm:self-auto shadow-inner">
            <span className="text-[8px] uppercase tracking-wider text-stone-500 font-extrabold px-1.5 hidden xs:inline">Taglia:</span>
            <button
              type="button"
              onClick={() => setButtonSize('sm')}
              className={`px-2 py-1 text-[8px] uppercase tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${
                buttonSize === 'sm'
                  ? 'bg-gradient-to-r from-gold-primary to-gold-light text-black shadow-md font-extrabold'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Compatta
            </button>
            <button
              type="button"
              onClick={() => setButtonSize('md')}
              className={`px-2 py-1 text-[8px] uppercase tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${
                buttonSize === 'md'
                  ? 'bg-gradient-to-r from-gold-primary to-gold-light text-black shadow-md font-extrabold'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Media
            </button>
            <button
              type="button"
              onClick={() => setButtonSize('lg')}
              className={`px-2 py-1 text-[8px] uppercase tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${
                buttonSize === 'lg'
                  ? 'bg-gradient-to-r from-gold-primary to-gold-light text-black shadow-md font-extrabold'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Grande
            </button>
          </div>
        </div>
        
        <div className={`grid gap-3 ${
          buttonSize === 'sm' 
            ? 'grid-cols-3 gap-2' 
            : buttonSize === 'md'
              ? 'grid-cols-2 gap-3'
              : 'grid-cols-2 gap-4'
        }`}>
          {prices.map((service, index) => {
            const isHighlight = index % 2 === 0;
            
            // Layout dimensions based on buttonSize
            const paddingClass = 
              buttonSize === 'sm' 
                ? 'py-3.5 px-3 rounded-xl min-h-[72px]' 
                : buttonSize === 'md'
                  ? 'py-5 px-4 rounded-2xl min-h-[96px]'
                  : 'py-6.5 px-5 rounded-3xl min-h-[116px]';
                  
            const textClass = 
              buttonSize === 'sm' 
                ? 'text-[7.5px]' 
                : 'text-[9px]';
                
            const amountClass = 
              buttonSize === 'sm' 
                ? 'text-base' 
                : buttonSize === 'md'
                  ? 'text-xl'
                  : 'text-2xl';

            return (
              <button
                key={service.id}
                type="button"
                disabled={isSaving}
                onClick={() => handleQuickAdd(service.amount)}
                className={`
                  ${isHighlight
                    ? "bg-gradient-to-br from-[#D4AF37] via-[#FCF6BA] to-[#B38728] text-black font-extrabold shadow-[0_4px_15px_rgba(215,180,60,0.15)] hover:brightness-110 active:scale-95 disabled:scale-100 disabled:opacity-40 transition-all cursor-pointer font-sans relative overflow-hidden group text-left"
                    : "bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white font-bold active:scale-95 disabled:scale-100 disabled:opacity-40 transition-all cursor-pointer font-sans relative text-left"
                  } ${paddingClass}
                `}
              >
                {/* Visual hover feedback on highlight button */}
                {isHighlight && (
                  <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
                <div className="flex flex-col justify-between h-full">
                  <span className={`uppercase tracking-wider mb-2 leading-none block truncate ${textClass} ${isHighlight ? 'text-black/75 font-extrabold' : 'text-[#8E8E93]'}`}>
                    {service.label}
                  </span>
                  <span className={`font-mono font-black ${amountClass} ${isHighlight ? 'text-black' : 'text-gold-primary'}`}>
                    +{service.amount}€
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Local Save Error Banner */}
      <AnimatePresence>
        {saveError && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-3.5 mb-5 text-[11px] font-semibold text-left font-sans flex items-start gap-2.5"
          >
            <span>⚠️</span>
            <span className="leading-relaxed flex-1">{saveError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM FORM BOX PANEL */}
      <div className="bg-[#0E0E10] border border-white/5 rounded-3xl p-5 mb-5 shadow-lg text-left">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E93] font-bold mb-3 pl-1">
          Importo Personalizzato
        </h3>
        
        <form onSubmit={handleCustomAdd} className="flex gap-2.5">
          <div className="flex-1 min-w-0 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-mono text-sm">€</span>
            <input
              ref={inputRef}
              type="number"
              placeholder="0.00"
              inputMode="numeric"
              disabled={isSaving}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full bg-black/40 border border-white/10 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 rounded-2xl pl-8 pr-4 py-3.5 text-left text-lg text-gold-light placeholder:text-[#8E8E93]/20 focus:outline-none disabled:opacity-40 transition-all font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-gold-primary hover:bg-[#B38728] text-black font-extrabold rounded-2xl px-6 active:scale-95 disabled:scale-100 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans text-xs whitespace-nowrap uppercase tracking-wider"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            Aggiungi
          </button>
        </form>
      </div>

      {/* DAILY TRANSACTION HISTORY BOX PANEL */}
      <div className="bg-[#0E0E10] border border-white/5 rounded-3xl p-5 mb-6 shadow-lg text-left">
        <div className="flex justify-between items-center mb-3.5 pl-1">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E93] font-semibold">
            Cronologia del Giorno
          </h3>
          {history.length > 0 && onUndoRecentTransaction && (
            <button
              type="button"
              onClick={() => setShowUndoConfirm(true)}
              className="text-[9px] uppercase tracking-wider text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer select-none transition-all border border-red-500/20 hover:border-red-500/40 bg-red-950/20 hover:bg-red-950/40 px-2.5 py-1.5 rounded-xl active:scale-95 duration-150"
            >
              <RotateCcw className="w-3 h-3" />
              Annulla Ultimo
            </button>
          )}
        </div>
        
        {history.length === 0 ? (
          <div className="bg-black/30 border border-white/5 rounded-2xl py-6 px-4 text-center text-xs text-[#8E8E93]/40 italic font-sans">
            Nessuna operazione registrata oggi
          </div>
        ) : (
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {history.map((item, index) => {
              const itemTime = new Date(item.timestamp).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              const isRecent = index === 0;
              return (
                <div
                  key={item.id}
                  className={`bg-black/40 border rounded-xl px-4 py-3 flex justify-between items-center transition-all ${
                    isRecent 
                      ? 'border-emerald-500/30 bg-emerald-500/[0.02]' 
                      : 'border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isRecent && (
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                    <span className="text-[10px] font-mono tracking-widest text-stone-400">
                      {itemTime}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 font-sans font-mono">
                    +{item.amount}€
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Back button only visible to Admin/Owner */}
      {isAdminMode ? (
        <button
          type="button"
          onClick={onExit}
          className="text-[#8E8E93] hover:text-gold-primary text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer font-sans"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla Dashboard Owner
        </button>
      ) : (
        <div className="text-[9px] uppercase tracking-[0.25em] text-red-500/60 font-medium font-sans">
          Sessione Protetta &bull; Usa "Logout" in alto per uscire
        </div>
      )}

      {/* Custom Confirmation Modal for Undo */}
      <AnimatePresence>
        {showUndoConfirm && recentTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-stone-950 border border-red-500/30 p-6 rounded-2xl shadow-[0_10px_35px_rgba(239,68,68,0.15)] text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-500/40 flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-6 h-6 text-red-500 animate-pulse" />
              </div>

              <h3 className="font-serif text-lg font-bold text-stone-100 tracking-wide mb-2 uppercase">
                Annulla Operazione
              </h3>
              
              <p className="text-xs text-stone-400 font-sans leading-relaxed mb-6">
                Sei sicuro di voler eliminare l'ultima transazione di <strong className="text-red-400 font-semibold font-mono text-sm">+{recentTransaction.amount}€</strong> delle ore <span className="font-mono text-stone-200">{recentTransactionTime}</span>?<br />
                Il totale della poltrona verrà ricalcolato.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUndoConfirm(false)}
                  disabled={isUndoing}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 text-stone-300 font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleUndoConfirm}
                  disabled={isUndoing}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-950/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUndoing ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    'Sì, Elimina'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
