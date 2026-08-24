import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RefreshCw, AlertTriangle, ShieldCheck, Download, Users, Lock, BarChart3, Clock, ChevronRight, Save, ClipboardList, Plus, Trash2, Settings, Bell, Zap, SlidersHorizontal, CalendarClock, Table } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';
import { ServicePrice, AppConfig, AppNotification } from '../types';
import { loginWithGoogle, getAccessToken, auth } from '../firebase';

interface ScreenAdminProps {
  totals: { [key: string]: number };
  histories?: { [key: string]: Array<{ id: string; amount: number; timestamp: string; type?: string; paymentMethod?: 'cash' | 'card' }> };
  onReset: () => Promise<void>;
  onBack: () => void;
  pinsData: { [key: string]: string };
  onUpdatePins: (newPins: { [key: string]: string }) => Promise<void>;
  barberNames: { [key: string]: string };
  onUpdateBarberNames: (newNames: { [key: string]: string }) => Promise<void>;
  prices: ServicePrice[];
  onUpdatePrices: (newPrices: ServicePrice[]) => Promise<void>;
  appConfig: AppConfig;
  onUpdateAppConfig: (newConfig: AppConfig) => Promise<void>;
  notifications: AppNotification[];
  onClearNotifications: () => Promise<void>;
}

type TabType = 'overview' | 'staff' | 'prices' | 'developer' | 'security';

export default function ScreenAdmin({
  totals,
  histories = {},
  onReset,
  onBack,
  pinsData,
  onUpdatePins,
  barberNames,
  onUpdateBarberNames,
  prices,
  onUpdatePrices,
  appConfig,
  onUpdateAppConfig,
  notifications,
  onClearNotifications
}: ScreenAdminProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetAfterExportConfirm, setShowResetAfterExportConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [expandedChairs, setExpandedChairs] = useState<{ [key: string]: boolean }>({});
  const [showLinks, setShowLinks] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Local state for PIN inputs
  const [localPins, setLocalPins] = useState<{ [key: string]: string }>(pinsData);
  const [isSavingPins, setIsSavingPins] = useState(false);
  const [pinSaveSuccess, setPinSaveSuccess] = useState(false);
  const [pinError, setPinError] = useState('');

  // Local state for Barber Names
  const [localNames, setLocalNames] = useState<{ [key: string]: string }>(barberNames);
  const [isSavingNames, setIsSavingNames] = useState(false);
  const [nameSaveSuccess, setNameSaveSuccess] = useState(false);

  // Local state for Prices
  const [localPrices, setLocalPrices] = useState<ServicePrice[]>(prices);
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [priceSaveSuccess, setPriceSaveSuccess] = useState(false);

  // Local state for AppConfig
  const [localConfig, setLocalConfig] = useState<AppConfig>(appConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  // Google Sheets integration state
  const [isExportingToSheets, setIsExportingToSheets] = useState(false);
  const [sheetsExportSuccess, setSheetsExportSuccess] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);

  useEffect(() => {
    if (auth.currentUser) {
      setGoogleUser(auth.currentUser);
    }
  }, []);

  // Keep local fields in-sync if remote database changes
  useEffect(() => {
    setLocalPins(pinsData);
  }, [pinsData]);

  useEffect(() => {
    setLocalNames(barberNames);
  }, [barberNames]);

  useEffect(() => {
    setLocalPrices(prices);
  }, [prices]);

  useEffect(() => {
    setLocalConfig(appConfig);
  }, [appConfig]);

  const globalHistory = useMemo(() => {
    const all: Array<{ id: string; amount: number; timestamp: string; chairNum: number; barberName: string; type?: string; paymentMethod?: 'cash' | 'card' }> = [];
    Object.keys(barberNames).filter(k => k.startsWith('chair')).forEach(key => {
      const num = parseInt(key.replace('chair', ''), 10);
      const list = histories[key] || [];
      list.forEach(item => {
        all.push({
          ...item,
          chairNum: num,
          barberName: barberNames[key] || `Poltrona ${num}`
        });
      });
    });
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [histories, barberNames]);

  const handleSaveBarberNames = async () => {
    setIsSavingNames(true);
    setNameSaveSuccess(false);
    try {
      await onUpdateBarberNames(localNames);
      await onUpdatePins(localPins);
      setNameSaveSuccess(true);
      setTimeout(() => setNameSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving names/pins:', err);
    } finally {
      setIsSavingNames(false);
    }
  };

  const handleSavePrices = async () => {
    setIsSavingPrices(true);
    setPriceSaveSuccess(false);
    try {
      await onUpdatePrices(localPrices);
      setPriceSaveSuccess(true);
      setTimeout(() => setPriceSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving prices:', err);
    } finally {
      setIsSavingPrices(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await onUpdateAppConfig(localConfig);
      setConfigSaveSuccess(true);
      setTimeout(() => setConfigSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving config:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const toggleFeature = (key: string) => {
    setLocalConfig(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: !prev.features[key]
      }
    }));
  };

  const handleAddPrice = () => {
    const newPrice: ServicePrice = {
      id: `price_${Date.now()}`,
      label: 'Nuovo Servizio',
      amount: 10
    };
    setLocalPrices([...localPrices, newPrice]);
  };

  const handleRemovePrice = (id: string) => {
    setLocalPrices(localPrices.filter(p => p.id !== id));
  };

  const handleAddChair = () => {
    const existingNums = Object.keys(localNames)
      .filter(k => k.startsWith('chair'))
      .map(k => parseInt(k.replace('chair', ''), 10))
      .sort((a, b) => a - b);
    
    let nextNum = 1;
    while (existingNums.includes(nextNum)) {
      nextNum++;
    }

    const newKey = `chair${nextNum}`;
    setLocalNames({ ...localNames, [newKey]: `Nuovo Barbiere` });
    setLocalPins({ ...localPins, [newKey]: '1111' });
  };

  const handleRemoveChair = (key: string) => {
    if (Object.keys(localNames).filter(k => k.startsWith('chair')).length <= 1) return;
    const { [key]: _, ...remainingNames } = localNames;
    const { [key]: __, ...remainingPins } = localPins;
    setLocalNames(remainingNames);
    setLocalPins(remainingPins);
  };

  const handleExportToSheets = async () => {
    let token = getAccessToken();
    
    if (!token) {
      try {
        const result = await loginWithGoogle();
        if (result) {
          token = result.accessToken;
          setGoogleUser(result.user);
        }
      } catch (err) {
        setSheetsError('Autenticazione Google fallita.');
        return;
      }
    }

    if (!token) return;

    setIsExportingToSheets(true);
    setSheetsError(null);
    setSheetsExportSuccess(false);

    try {
      const today = new Date().toLocaleDateString('it-IT');
      const todayTabName = today.replace(/\//g, '-'); // e.g. "01-07-2026"
      
      let spreadsheetId = appConfig.spreadsheetId;
      let isExistingSpreadsheet = false;
      let sheetsList: string[] = [];

      // 1. Try checking if existing spreadsheet is valid
      if (spreadsheetId) {
        try {
          const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties.title`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (checkRes.ok) {
            const data = await checkRes.json();
            isExistingSpreadsheet = true;
            if (Array.isArray(data.sheets)) {
              sheetsList = data.sheets.map((s: any) => s.properties?.title || '');
            }
          } else {
            console.warn("Stored spreadsheetId is invalid or inaccessible. Creating a new one.");
            spreadsheetId = undefined;
          }
        } catch (checkErr) {
          console.warn("Error fetching spreadsheet metadata:", checkErr);
          spreadsheetId = undefined;
        }
      }

      // 2. Create spreadsheet if we don't have a valid one
      if (!spreadsheetId) {
        const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: {
              title: `Zmegri - Registro Incassi`
            }
          })
        });

        const spreadsheet = await createRes.json();
        if (!createRes.ok) {
          throw new Error(`Impossibile creare il foglio: ${spreadsheet.error?.message || createRes.statusText}`);
        }
        
        spreadsheetId = spreadsheet.spreadsheetId;
        
        // Save the new spreadsheetId and URL globally so it persists
        const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
        await onUpdateAppConfig({
          ...appConfig,
          spreadsheetId,
          spreadsheetUrl
        });

        // First tab in a new spreadsheet is renamed to today's date
        const renameRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: 0,
                    title: todayTabName
                  },
                  fields: 'title'
                }
              }
            ]
          })
        });
        
        if (!renameRes.ok) {
          console.warn("Could not rename first tab, writing to fallback default tab.");
        }
        sheetsList = [todayTabName];
      }

      // Helper function to dynamically add tab if it doesn't exist
      const ensureSheetExists = async (sheetName: string) => {
        if (!sheetsList.includes(sheetName)) {
          const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: sheetName
                    }
                  }
                }
              ]
            })
          });
          if (addRes.ok) {
            sheetsList.push(sheetName);
          } else {
            const errData = await addRes.json();
            throw new Error(`Impossibile creare la scheda "${sheetName}": ${errData.error?.message || addRes.statusText}`);
          }
        }
      };

      // 3. Ensure both the daily sheet and the "Totale Poltrone" sheet exist
      await ensureSheetExists(todayTabName);
      await ensureSheetExists("Totale Poltrone");

      // Clear the daily sheet values so we overwrite cleanly
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${todayTabName}'!A1:Z1000:clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Clear the summary "Totale Poltrone" sheet values so we overwrite cleanly
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Totale Poltrone'!A1:Z1000:clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // 4. Prepare data rows for todayTabName
      const rows = [
        ['ZMEGRI - Report Cassa'],
        [`Esportato il:`, `${today} alle ${new Date().toLocaleTimeString('it-IT')}`],
        [''],
        ['RIASSUNTO INCASSI'],
        ['Poltrona', 'Barbiere', 'Incasso Totale (€)', 'Contanti (€)', 'POS/Carta (€)'],
      ];

      Object.keys(barberNames).filter(k => k.startsWith('chair')).forEach((key) => {
        const num = key.replace('chair', '');
        const name = barberNames[key];
        const total = totals[key] || 0;
        
        let chairCash = 0;
        let chairCard = 0;
        const chairHistory = histories[key] || [];
        chairHistory.forEach(item => {
          if (item.paymentMethod === 'card') {
            chairCard += item.amount;
          } else {
            chairCash += item.amount;
          }
        });

        rows.push([`Poltrona 0${num}`, name, total.toString(), chairCash.toString(), chairCard.toString()]);
      });

      rows.push(['TOTALE GENERALE', '', grandTotal.toString(), grandCashTotal.toString(), grandCardTotal.toString()]);
      rows.push(['']);
      rows.push(['DETTAGLIO TRANSAZIONI']);
      rows.push(['Timestamp', 'Poltrona', 'Barbiere', 'Importo (€)', 'Metodo di Pagamento']);

      globalHistory.forEach(item => {
        const itemTime = new Date(item.timestamp).toLocaleString('it-IT');
        const paymentMethodLabel = item.paymentMethod === 'card' ? 'Carta/POS' : 'Contanti';
        rows.push([itemTime, `Poltrona 0${item.chairNum}`, item.barberName, item.amount.toString(), paymentMethodLabel]);
      });

      // 5. Prepare data rows for "Totale Poltrone" (summary tab)
      const summaryRows = [
        ['ZMEGRI - RIEPILOGO POLTRONE / BARBIERI'],
        [`Ultimo Aggiornamento:`, `${today} alle ${new Date().toLocaleTimeString('it-IT')}`],
        [''],
        ['TABELLA RIASSUNTIVA INCASSI'],
        ['Poltrona', 'Barbiere', 'Incasso Totale (€)', 'Incasso Contanti (€)', 'Incasso POS/Carta (€)', 'Percentuale sul Totale (%)'],
      ];

      Object.keys(barberNames).filter(k => k.startsWith('chair')).sort().forEach((key) => {
        const num = key.replace('chair', '');
        const name = barberNames[key];
        const total = totals[key] || 0;
        const pct = percent(total);
        
        let chairCash = 0;
        let chairCard = 0;
        const chairHistory = histories[key] || [];
        chairHistory.forEach(item => {
          if (item.paymentMethod === 'card') {
            chairCard += item.amount;
          } else {
            chairCash += item.amount;
          }
        });

        summaryRows.push([
          `Poltrona 0${num}`, 
          name, 
          total.toString(), 
          chairCash.toString(), 
          chairCard.toString(), 
          `${pct}%`
        ]);
      });

      summaryRows.push([
        'TOTALE GENERALE', 
        '', 
        grandTotal.toString(), 
        grandCashTotal.toString(), 
        grandCardTotal.toString(), 
        '100%'
      ]);

      // 6. Write data using PUT to today's daily sheet
      const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${todayTabName}'!A1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: rows
        })
      });

      const writeData = await writeRes.json();
      if (!writeRes.ok) {
        throw new Error(`Errore inserimento dati odierni: ${writeData.error?.message || writeRes.statusText}`);
      }

      // 7. Write data using PUT to "Totale Poltrone" sheet
      const writeSummaryRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Totale Poltrone'!A1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: summaryRows
        })
      });

      const writeSummaryData = await writeSummaryRes.json();
      if (!writeSummaryRes.ok) {
        throw new Error(`Errore inserimento riepilogo poltrone: ${writeSummaryData.error?.message || writeSummaryRes.statusText}`);
      }

      setSheetsExportSuccess(true);
      setShowResetAfterExportConfirm(true);
      window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
    } catch (err: any) {
      console.error('Sheets Export Error:', err);
      setSheetsError(err.message || 'Errore durante l\'esportazione.');
    } finally {
      setIsExportingToSheets(false);
    }
  };

  const handlePriceChange = (id: string, field: 'label' | 'amount', value: string | number) => {
    setLocalPrices(localPrices.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSavePins = async () => {
    setPinError('');
    setPinSaveSuccess(false);

    const pins = Object.values(localPins) as string[];
    if (pins.some(p => p.length !== 4)) {
      setPinError('Tutti i PIN devono essere composti da esattamente 4 cifre.');
      return;
    }

    const isNumeric = (val: string) => /^\d+$/.test(val);
    if (pins.some(p => !isNumeric(p))) {
      setPinError('I PIN devono contenere solo numeri.');
      return;
    }

    const pinsSet = new Set(pins);
    if (pinsSet.size < pins.length) {
      setPinError('Campi duplicati! Ogni postazione deve avere un PIN univoco.');
      return;
    }

    setIsSavingPins(true);
    try {
      await onUpdatePins(localPins);
      setPinSaveSuccess(true);
      setTimeout(() => setPinSaveSuccess(false), 3000);
    } catch (err) {
      setPinError('Errore durante il salvataggio dei PIN.');
    } finally {
      setIsSavingPins(false);
    }
  };

  const getFullLink = (query: string) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return query ? `${origin}${pathname}${query}` : `${origin}${pathname}`;
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const handleExportCSV = () => {
    const todayStr = new Date().toLocaleDateString('it-IT');
    const todayTimeStr = new Date().toLocaleTimeString('it-IT');
    
    let csvContent = `sep=;\n`;
    csvContent += `ZMEGRI - Report Cassa\n`;
    csvContent += `Esportato il:;${todayStr} alle ${todayTimeStr}\n\n`;
    
    csvContent += `RIASSUNTO INCASSI\n`;
    csvContent += `Poltrona;Barbiere;Incasso Totale (€)\n`;
    Object.keys(barberNames).filter(k => k.startsWith('chair')).forEach((key) => {
      const num = key.replace('chair', '');
      const name = barberNames[key];
      const total = totals[key] || 0;
      csvContent += `Poltrona 0${num};${name};${total}\n`;
    });
    csvContent += `TOTALE GENERALE;;${grandTotal}\n\n`;
    
    csvContent += `DETTAGLIO TRANSAZIONI\n`;
    csvContent += `Timestamp;Poltrona;Barbiere;Importo (€);Metodo di Pagamento\n`;
    globalHistory.forEach(item => {
      const itemTime = new Date(item.timestamp).toLocaleString('it-IT');
      const methodLabel = item.paymentMethod === 'card' ? 'Carta/POS' : 'Contanti';
      csvContent += `"${itemTime}";Poltrona 0${item.chairNum};${item.barberName};${item.amount};${methodLabel}\n`;
    });
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Zmegri_Report_${todayStr.replace(/\//g, '-')}.csv`);
    link.click();
    setShowResetAfterExportConfirm(true);
  };

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  const grandCashTotal = useMemo(() => {
    let total = 0;
    Object.keys(histories).forEach(key => {
      const list = histories[key] || [];
      list.forEach(item => {
        if (item.paymentMethod !== 'card') {
          total += item.amount;
        }
      });
    });
    return total;
  }, [histories]);

  const grandCardTotal = useMemo(() => {
    let total = 0;
    Object.keys(histories).forEach(key => {
      const list = histories[key] || [];
      list.forEach(item => {
        if (item.paymentMethod === 'card') {
          total += item.amount;
        }
      });
    });
    return total;
  }, [histories]);

  const handleReset = async () => {
    setIsResetting(true);
    await onReset();
    setIsResetting(false);
    setShowConfirm(false);
    setShowResetAfterExportConfirm(false);
  };

  const percent = (val: number) => {
    if (grandTotal === 0) return 0;
    return Math.round((val / grandTotal) * 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.99, y: -15 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full text-center max-w-5xl mx-auto px-1"
    >
      {/* Luxury Brand Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-8 gap-4 border-b border-white/5 pb-6">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-ping" />
            <span className="font-sans text-[9px] uppercase tracking-[0.4em] text-gold-light font-bold">
              Salone Esclusivo • Hub Direzionale
            </span>
          </div>
          <h2 className="font-serif text-3xl font-extrabold tracking-[2px] text-white uppercase flex items-center justify-center md:justify-start gap-2.5">
            <span className="gold-text-gradient">ZMEGRI</span>
            <span className="text-stone-500 font-light text-xl">| ADMIN</span>
          </h2>
        </div>
        
        {/* Luxury Tab Navigation */}
        <div className="flex flex-wrap gap-1 p-1 bg-[#0A0A0C] border border-white/5 rounded-2xl shadow-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'overview' 
                ? 'bg-gold-primary/10 text-gold-light border-gold-primary/30 shadow-[0_2px_12px_rgba(212,175,55,0.06)] font-extrabold' 
                : 'text-stone-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'staff' 
                ? 'bg-gold-primary/10 text-gold-light border-gold-primary/30 shadow-[0_2px_12px_rgba(212,175,55,0.06)] font-extrabold' 
                : 'text-stone-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Staff
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'prices' 
                ? 'bg-gold-primary/10 text-gold-light border-gold-primary/30 shadow-[0_2px_12px_rgba(212,175,55,0.06)] font-extrabold' 
                : 'text-stone-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Listino
          </button>
          <button
            onClick={() => setActiveTab('developer')}
            className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'developer' 
                ? 'bg-gold-primary/10 text-gold-light border-gold-primary/30 shadow-[0_2px_12px_rgba(212,175,55,0.06)] font-extrabold' 
                : 'text-stone-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Sincro
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'security' 
                ? 'bg-gold-primary/10 text-gold-light border-gold-primary/30 shadow-[0_2px_12px_rgba(212,175,55,0.06)] font-extrabold' 
                : 'text-stone-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Sicurezza
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 text-left"
          >
            {/* Landing-Page-Style Spotlight Hero Panel: Real-Time Total Income */}
            <div className="bg-gradient-to-b from-[#121216] to-[#08080A] border border-gold-primary/20 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(212,175,55,0.04)]">
              
              {/* Luxury ambient light behind */}
              <div className="absolute right-0 top-0 w-80 h-80 bg-gold-primary/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute left-0 bottom-0 w-60 h-60 bg-gold-dark/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Total Counter Core */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-extrabold">
                      Incasso Totale in Tempo Reale
                    </span>
                  </div>
                  
                  <div className="flex items-baseline">
                    <span className="text-3xl sm:text-4xl font-serif text-gold-primary font-medium mr-1 select-none">€</span>
                    <span className="text-6xl sm:text-7xl lg:text-8xl font-serif font-extrabold tracking-tighter gold-text-gradient drop-shadow-[0_2px_15px_rgba(212,175,55,0.15)] leading-none">
                      <AnimatedCounter value={grandTotal} />
                    </span>
                  </div>
                  
                  <p className="text-stone-500 text-[11px] font-sans tracking-wide">
                    Monitoraggio attivo per la giornata odierna. Tutti i dati sono sincronizzati in tempo reale.
                  </p>
                </div>

                {/* Performance & Action Panel */}
                <div className="md:w-64 bg-black/40 border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <span className="text-[9px] uppercase tracking-widest text-[#8E8E93] font-bold block">
                      Strumenti di Controllo
                    </span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="bg-stone-900 hover:bg-gold-primary/15 hover:text-gold-light border border-white/5 hover:border-gold-primary/30 text-stone-300 py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 focus:outline-none shadow-md"
                        title="Esporta CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirm(true)}
                        className="bg-stone-900 hover:bg-red-500/15 hover:text-red-400 border border-white/5 hover:border-red-500/30 text-stone-300 py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 focus:outline-none shadow-md"
                        title="Reset"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="pt-3.5 border-t border-white/5 space-y-1">
                    <span className="text-[8px] uppercase tracking-widest text-stone-500 block leading-none">Ultima Operazione</span>
                    <p className="text-[10px] text-stone-300 font-mono font-semibold truncate">
                      {globalHistory.length > 0 
                        ? `${globalHistory[0].barberName}: +${globalHistory[0].amount}€`
                        : "In attesa di transazioni"
                      }
                    </p>
                  </div>
                </div>

              </div>

              {/* High-End Split Revenue Analytics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5 relative z-10">
                <div className="bg-black/35 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-500/20 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400 font-serif font-bold text-lg">
                      C
                    </div>
                    <div>
                      <span className="text-[8.5px] uppercase tracking-wider text-stone-500 block leading-none mb-1">Pagamenti in Contanti</span>
                      <span className="text-xl font-semibold font-mono text-stone-100">€{grandCashTotal}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-mono">
                      {percent(grandCashTotal)}%
                    </span>
                  </div>
                </div>

                <div className="bg-black/35 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-blue-500/20 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-400 font-serif font-bold text-lg">
                      P
                    </div>
                    <div>
                      <span className="text-[8.5px] uppercase tracking-wider text-stone-500 block leading-none mb-1">Pagamenti POS / Carte</span>
                      <span className="text-xl font-semibold font-mono text-stone-100">€{grandCardTotal}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full font-mono">
                      {percent(grandCardTotal)}%
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Incassi per Poltrona Header */}
            <div className="flex items-center justify-between mt-8 mb-4 pl-1 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gold-primary" />
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-white font-extrabold">Analisi Singole Poltrone</h3>
              </div>
              <span className="text-[9px] text-stone-500 font-mono">Dettaglio quote e transazioni</span>
            </div>

            {/* Grid layout of Chair boxes ("caselle") */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(barberNames)
                .filter(k => k.startsWith('chair'))
                .sort((a, b) => a.localeCompare(b))
                .map((key) => {
                  const num = key.replace('chair', '');
                  const val = totals[key] || 0;
                  const p = percent(val);
                  const barberName = barberNames[key];

                  // Calculate cash/card breakdown for this specific poltrona
                  const chairHistory = histories[key] || [];
                  const chairCash = chairHistory
                    .filter(item => item.paymentMethod !== 'card')
                    .reduce((sum, item) => sum + item.amount, 0);
                  const chairCard = chairHistory
                    .filter(item => item.paymentMethod === 'card')
                    .reduce((sum, item) => sum + item.amount, 0);

                  return (
                    <div 
                      key={key} 
                      className="bg-[#0A0A0C] border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-gold-primary/20 hover:shadow-[0_8px_30px_rgba(212,175,55,0.03)] transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Top section: Barber Identification and Total */}
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] uppercase tracking-widest text-gold-primary font-mono font-bold">
                              POSTAZIONE 0{num}
                            </span>
                            <span className="font-serif text-lg text-white font-extrabold group-hover:text-gold-light transition-colors leading-tight">
                              {barberName}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gold-primary font-serif mr-0.5 font-bold">€</span>
                            <span className="font-bold text-white font-serif text-2xl tracking-tight">
                              <AnimatedCounter value={val} />
                            </span>
                          </div>
                        </div>

                        {/* Sub-panels cash/POS breakdown */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="bg-white/1 border border-white/5 rounded-xl p-2.5 flex flex-col justify-center">
                            <span className="text-[7px] uppercase tracking-widest text-stone-500 font-bold block leading-none mb-1">Contanti</span>
                            <span className="text-xs font-bold font-mono text-stone-200">€{chairCash}</span>
                          </div>
                          <div className="bg-white/1 border border-white/5 rounded-xl p-2.5 flex flex-col justify-center">
                            <span className="text-[7px] uppercase tracking-widest text-stone-500 font-bold block leading-none mb-1">POS / Carta</span>
                            <span className="text-xs font-bold font-mono text-stone-200">€{chairCard}</span>
                          </div>
                        </div>
                        
                        {/* Custom Gold Progress Bar with beautiful shadow */}
                        <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/5 mb-4 relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${p}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-gold-dark via-gold-primary to-gold-light rounded-full"
                          />
                        </div>
                      </div>

                      {/* Bottom section: Quota display and Details trigger */}
                      <div className="flex justify-between items-center text-[9px] text-stone-400 font-mono uppercase tracking-wider relative z-10 pt-2.5 border-t border-white/5">
                        <span className="text-[9.5px]">Quota sul totale: <strong className="text-gold-primary font-bold">{p}%</strong></span>
                        <button
                          type="button"
                          onClick={() => setExpandedChairs(prev => ({ ...prev, [key]: !prev[key] }))}
                          className="text-gold-primary hover:text-white transition-colors duration-250 cursor-pointer font-sans font-bold flex items-center gap-1 focus:outline-none"
                        >
                          <span className="text-[9px]">{expandedChairs[key] ? 'Chiudi ▲' : 'Dettagli ▼'}</span>
                        </button>
                      </div>

                      <AnimatePresence>
                        {expandedChairs[key] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mt-3 pt-3 border-t border-white/5"
                          >
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {(!histories[key] || histories[key].length === 0) ? (
                                <p className="text-[9px] text-stone-500 italic py-1.5 pl-0.5">Nessuna operazione registrata oggi.</p>
                              ) : (
                                histories[key].map(item => (
                                  <div key={item.id} className="flex justify-between items-center bg-black/40 rounded-xl px-3 py-2 border border-white/5 text-[9.5px] font-mono">
                                    <div className="flex items-center gap-2">
                                      <span className="text-stone-400">{new Date(item.timestamp).toLocaleTimeString('it-IT')}</span>
                                      <span className="text-[7px] px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-stone-400 uppercase tracking-widest">
                                        {item.paymentMethod === 'card' ? 'Carta' : 'Cont.'}
                                      </span>
                                    </div>
                                    <span className="font-bold text-gold-light">+{item.amount}€</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>

            {/* Global Recent Activity Feed - Ledger style */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4 pl-1 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gold-primary" />
                  <h3 className="text-[10px] uppercase tracking-[0.3em] text-white font-extrabold">Cronologia Transazioni Globale</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-stone-500 font-mono hidden md:inline">Movimenti giornalieri ordinati</span>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="bg-gold-primary/10 hover:bg-gold-primary/20 border border-gold-primary/20 hover:border-gold-primary/40 text-gold-light py-1 px-2.5 rounded-lg transition-all cursor-pointer font-bold text-[8.5px] uppercase tracking-wider flex items-center gap-1 focus:outline-none shadow"
                    title="Esporta CSV"
                  >
                    <Download className="w-3 h-3" />
                    Scarica CSV
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {globalHistory.length === 0 ? (
                  <div className="text-center py-8 text-stone-500 text-xs italic bg-[#0A0A0C] border border-white/5 rounded-2xl">
                    Nessun movimento registrato oggi.
                  </div>
                ) : (
                  globalHistory.map((item) => (
                    <div key={item.id} className="bg-[#0A0A0C] border border-white/5 rounded-xl px-4 py-3 flex justify-between items-center group hover:border-gold-primary/20 transition-all duration-300 text-xs font-mono">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-black flex items-center justify-center text-[9px] font-bold text-gold-primary border border-gold-primary/10 group-hover:border-gold-primary/30 transition-all">
                          {item.chairNum}
                        </div>
                        <div>
                          <p className="text-[11px] text-white font-sans font-extrabold leading-none mb-1">{item.barberName}</p>
                          <p className="text-[8.5px] text-stone-500 leading-none">{new Date(item.timestamp).toLocaleTimeString('it-IT')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[7.5px] px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-stone-400 uppercase tracking-widest font-bold">
                          {item.paymentMethod === 'card' ? 'Carta' : 'Contanti'}
                        </span>
                        <span className="font-bold text-gold-primary text-[12px] font-serif">+{item.amount}€</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'staff' && (
          <motion.div
            key="staff"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 text-left"
          >
            <div className="bg-[#0A0A0C] border border-white/5 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-primary font-extrabold mb-5 flex items-center gap-2">
                <Users className="w-4 h-4 text-gold-primary" /> GESTIONE BARBIERI & POLTRONE
              </h3>
              <div className="space-y-4">
                {Object.keys(localNames)
                  .filter(k => k.startsWith('chair'))
                  .sort((a, b) => a.localeCompare(b))
                  .map((key) => {
                    const num = key.replace('chair', '');
                    return (
                      <div key={key} className="flex gap-2 items-end group">
                        <div className="flex-1 flex flex-col gap-1.5">
                          <label className="text-[9px] uppercase tracking-widest text-stone-500 font-extrabold ml-1">Poltrona 0{num}</label>
                          <input
                            type="text"
                            value={localNames[key]}
                            onChange={(e) => setLocalNames(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-sans outline-none focus:border-gold-primary/60 focus:ring-1 focus:ring-gold-primary/15 transition-all shadow-inner"
                            placeholder={`Nome Barbiere ${num}`}
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveChair(key)}
                          className="p-3 mb-0.5 text-stone-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                <button
                  onClick={handleAddChair}
                  className="w-full border border-dashed border-gold-primary/10 hover:border-gold-primary/30 text-stone-500 hover:text-gold-primary py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Aggiungi Nuova Poltrona
                </button>
              </div>
              <div className="mt-8 pt-5 border-t border-white/5">
                {nameSaveSuccess && (
                  <p className="text-[10px] text-emerald-400 font-bold mb-3 animate-pulse">✓ Configurazione salvata con successo!</p>
                ) }
                <button
                  onClick={handleSaveBarberNames}
                  disabled={isSavingNames}
                  className="w-full bg-gradient-to-r from-gold-primary via-gold-light to-gold-dark text-black py-3 px-6 rounded-xl text-xs font-extrabold tracking-widest transition-all duration-300 hover:brightness-110 shadow-[0_4px_15px_rgba(212,175,55,0.15)] flex items-center justify-center gap-2 cursor-pointer uppercase"
                >
                  <Save className="w-4 h-4 text-black" />
                  {isSavingNames ? 'Salvataggio...' : 'Salva Struttura'}
                </button>
              </div>
            </div>

            <div className="bg-[#0A0A0C] border border-white/5 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-[#8E8E93] font-extrabold mb-4">ACCESS LINK INDIVIDUALI</h3>
              <p className="text-[10px] text-stone-500 leading-relaxed mb-4">
                Condividi questi link privati con ciascun barbiere per consentire l'inserimento autonomo dei propri incassi in tempo reale.
              </p>
              <div className="space-y-4">
                {Object.keys(barberNames)
                  .filter(k => k.startsWith('chair'))
                  .sort((a,b) => a.localeCompare(b))
                  .map((key) => {
                    const num = key.replace('chair', '');
                    const l = getFullLink(`?chair=${key}`);
                    const copyKey = `chair_link_${num}`;
                    return (
                      <div key={key} className="space-y-1 bg-black/35 border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between md:flex-row md:items-center gap-2">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-extrabold block">{barberNames[key]}</span>
                          <span className="text-[8px] text-stone-600 font-mono font-bold block mt-0.5">POSTAZIONE 0{num}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="bg-black/80 border border-white/5 rounded-xl px-3 py-2 text-[9.5px] text-stone-500 font-mono truncate max-w-[150px] md:max-w-[280px]">
                            {l}
                          </div>
                          <button
                            onClick={() => handleCopy(copyKey, l)}
                            className="bg-stone-900 hover:bg-gold-primary hover:text-black border border-white/10 hover:border-gold-primary text-[9px] uppercase tracking-wider font-extrabold text-gold-light px-3.5 py-2 rounded-xl transition-all duration-250 cursor-pointer shrink-0"
                          >
                            {copiedKey === copyKey ? 'Copiato' : 'Copia'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'prices' && (
          <motion.div
            key="prices"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 text-left"
          >
            <div className="bg-[#0A0A0C] border border-white/5 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-primary font-extrabold mb-5 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-gold-primary" /> LISTINO SERVIZI ESCLUSIVI
              </h3>
              
              <div className="space-y-3">
                {/* Single Header Row (Only shown when there are items, hidden on mobile) */}
                {localPrices.length > 0 && (
                  <div className="hidden sm:flex gap-2 text-[9px] uppercase tracking-widest text-stone-500 font-extrabold px-3 pb-1">
                    <div className="flex-1">Servizio</div>
                    <div className="w-28 text-center">Importo (€)</div>
                    <div className="w-10"></div> {/* Space for delete button */}
                  </div>
                )}
                
                <div className="space-y-3 sm:space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {localPrices.map((price) => (
                    <div key={price.id} className="flex flex-col sm:flex-row gap-3 sm:gap-2 items-stretch sm:items-center group bg-white/[0.01] hover:bg-white/[0.03] p-3 sm:p-2 rounded-xl border border-white/[0.03] hover:border-white/[0.08] transition-all">
                      <div className="w-full sm:flex-1 flex flex-col gap-1 sm:gap-0">
                        <span className="text-[8px] uppercase tracking-widest text-stone-500 font-extrabold sm:hidden pl-1">Servizio</span>
                        <input
                          type="text"
                          value={price.label}
                          placeholder="es. Taglio Capelli, Barba..."
                          onChange={(e) => handlePriceChange(price.id, 'label', e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-gold-primary/60 focus:ring-1 focus:ring-gold-primary/15 transition-all shadow-inner font-medium"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex-1 sm:w-28 flex flex-col gap-1 sm:gap-0">
                          <span className="text-[8px] uppercase tracking-widest text-stone-500 font-extrabold sm:hidden pl-1">Importo (€)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={price.amount}
                            placeholder="0.00"
                            onChange={(e) => handlePriceChange(price.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white text-center outline-none focus:border-gold-primary/60 focus:ring-1 focus:ring-gold-primary/15 transition-all shadow-inner font-mono font-bold"
                          />
                        </div>
                        
                        <div className="flex-none w-10 flex justify-center pt-4 sm:pt-0">
                          <button
                            onClick={() => handleRemovePrice(price.id)}
                            className="p-2.5 text-stone-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                            title="Elimina servizio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={handleAddPrice}
                  className="w-full border border-dashed border-gold-primary/10 hover:border-gold-primary/30 text-stone-500 hover:text-gold-primary py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold cursor-pointer mt-3 bg-black/20 hover:bg-black/40"
                >
                  <Plus className="w-4 h-4" /> Aggiungi Nuovo Servizio
                </button>
              </div>

              <div className="mt-6 pt-5 border-t border-white/5">
                {priceSaveSuccess && (
                  <p className="text-[10px] text-emerald-400 font-bold mb-3 animate-pulse">✓ Listino prezzi salvato con successo!</p>
                )}
                <button
                  onClick={handleSavePrices}
                  disabled={isSavingPrices}
                  className="w-full bg-gradient-to-r from-gold-primary via-gold-light to-gold-dark text-black py-3 px-6 rounded-xl text-xs font-extrabold tracking-widest transition-all duration-300 hover:brightness-110 shadow-[0_4px_15px_rgba(212,175,55,0.15)] flex items-center justify-center gap-2 cursor-pointer uppercase"
                >
                  <Save className="w-4 h-4 text-black" />
                  {isSavingPrices ? 'Salvataggio...' : 'Salva Listino'}
                </button>
              </div>
            </div>
            
            <p className="text-[9.5px] text-stone-500 px-4 leading-relaxed italic">
              * Le modifiche apportate al listino prezzi verranno applicate istantaneamente sui pulsanti di scelta rapida di tutte le postazioni attive nel salone.
            </p>
          </motion.div>
        )}

        {activeTab === 'developer' && (
          <motion.div
            key="developer"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 text-left"
          >
            {/* Notifications Section */}
            <div className="bg-[#0A0A0C] border border-white/5 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
                <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-primary font-extrabold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gold-primary" /> NOTIFICHE REAL-TIME ATTIVITÀ
                </h3>
                {notifications.length > 0 && (
                  <button onClick={onClearNotifications} className="text-[9px] uppercase font-bold text-stone-500 hover:text-white cursor-pointer transition-colors">Pulisci</button>
                )}
              </div>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <p className="text-[10px] text-stone-600 italic py-5 text-center bg-black/20 rounded-xl border border-white/5">Nessun evento in tempo reale registrato al momento.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="bg-black/40 border border-white/5 rounded-xl p-3 flex gap-3 items-start hover:border-gold-primary/10 transition-all">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${n.type === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} />
                      <div className="flex-1">
                        <p className="text-[11px] font-extrabold text-stone-200">{n.title}</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">{n.message}</p>
                        <p className="text-[8px] text-stone-600 font-mono mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Export Settings */}
            <div className="bg-[#0A0A0C] border border-white/5 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-primary font-extrabold mb-4 flex items-center gap-2">
                <Table className="w-4 h-4 text-gold-primary" /> REGISTRO REGISTRAZIONE GOOGLE SHEETS
              </h3>
              <div className="space-y-5">
                <p className="text-[10px] text-stone-500 leading-relaxed italic">
                  I report verranno registrati in modo intelligente all'interno di un unico foglio di calcolo master. Ogni giorno verrà creata automaticamente una nuova scheda (tab) per evitare duplicati.
                </p>
                
                {googleUser && (
                  <div className="flex items-center gap-3 bg-black/40 p-4 rounded-xl border border-white/5">
                    {googleUser.photoURL ? (
                      <img src={googleUser.photoURL} alt="User" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-gold-primary" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gold-primary/20 flex items-center justify-center text-gold-primary font-bold">
                        {googleUser.email?.[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] font-bold text-stone-200 truncate">{googleUser.displayName || 'Utente Google'}</p>
                      <p className="text-[8px] text-stone-500 font-mono truncate">{googleUser.email}</p>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  </div>
                )}

                {appConfig.spreadsheetId && appConfig.spreadsheetUrl && (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-left">
                    <span className="text-[8px] uppercase tracking-widest text-emerald-400 font-bold block mb-1.5">FOGLIO MASTER COLLEGATO IN CLOUD</span>
                    <a 
                      href={appConfig.spreadsheetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[11px] text-stone-200 hover:text-emerald-400 font-bold underline break-all inline-flex items-center gap-2 transition-colors"
                    >
                      <Table className="w-4 h-4 text-emerald-400 shrink-0" />
                      Apri Registro Cloud Master su Google Drive
                    </a>
                  </div>
                )}

                <button
                  onClick={handleExportToSheets}
                  disabled={isExportingToSheets}
                  className={`w-full py-3.5 px-6 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                    isExportingToSheets 
                      ? 'bg-stone-800 text-stone-500 border border-white/5' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_4px_15px_rgba(16,185,129,0.15)]'
                  }`}
                >
                  <Table className="w-4 h-4" />
                  {isExportingToSheets ? 'Aggiornamento...' : googleUser ? 'Aggiorna Registro Sheets' : 'Connetti Google Sheets'}
                </button>

                {sheetsExportSuccess && (
                  <p className="text-[10px] text-emerald-400 font-bold text-center animate-bounce">✓ Foglio Master aggiornato!</p>
                )}
                {sheetsError && (
                  <p className="text-[10px] text-red-400 font-bold text-center">⚠️ {sheetsError}</p>
                )}
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="bg-[#0A0A0C] border border-white/5 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-primary font-extrabold mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-gold-primary" /> OPZIONI SISTEMA
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-black/20 p-3.5 rounded-xl border border-white/5">
                  <div>
                    <p className="text-xs font-bold text-stone-200">Notifiche Sonore Admin</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">Avvisi sonori e visivi per incassi barbieri</p>
                  </div>
                  <button
                    onClick={() => setLocalConfig(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))}
                    className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${localConfig.notificationsEnabled ? 'bg-emerald-500' : 'bg-stone-800'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${localConfig.notificationsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                
                {Object.keys(localConfig.features).map(feat => (
                  <div key={feat} className="flex justify-between items-center bg-black/20 p-3.5 rounded-xl border border-white/5">
                    <div>
                      <p className="text-xs font-bold text-stone-200 uppercase tracking-tighter">{feat.replace(/([A-Z])/g, ' $1')}</p>
                    </div>
                    <button
                      onClick={() => toggleFeature(feat)}
                      className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${localConfig.features[feat] ? 'bg-gold-primary' : 'bg-stone-800'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${localConfig.features[feat] ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Settings */}
            <div className="bg-[#0A0A0C] border border-white/5 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-primary font-extrabold mb-4 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-gold-primary" /> PIANIFICAZIONE AUTOMATICA EXPORT
              </h3>
              <div className="space-y-5">
                <div className="flex justify-between items-center bg-black/20 p-3.5 rounded-xl border border-white/5">
                  <div>
                    <p className="text-xs font-bold text-stone-200">Abilita Export Quotidiano</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">Salva report ogni giorno a un'ora precisa</p>
                  </div>
                  <button
                    onClick={() => setLocalConfig(prev => ({ ...prev, autoExportEnabled: !prev.autoExportEnabled }))}
                    className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${localConfig.autoExportEnabled ? 'bg-gold-primary' : 'bg-stone-800'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${localConfig.autoExportEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                
                {localConfig.autoExportEnabled && (
                  <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-1 bg-black/35 p-4 rounded-xl border border-white/5">
                    <label className="text-[10px] uppercase tracking-widest text-stone-500 font-extrabold ml-1">Orario di Export (HH:MM)</label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={localConfig.exportTime}
                        onChange={(e) => setLocalConfig(prev => ({ ...prev, exportTime: e.target.value }))}
                        className="bg-stone-955 border border-white/5 rounded-xl px-4 py-3 text-lg font-mono text-stone-200 w-full outline-none focus:border-gold-primary transition-all shadow-inner"
                      />
                    </div>
                    <p className="text-[9.5px] text-stone-500 italic">* Il sistema eseguirà lo snapshot automatico dei dati ogni giorno alle {localConfig.exportTime}.</p>
                  </div>
                )}
              </div>
              
              <div className="mt-8 pt-5 border-t border-white/5">
                {configSaveSuccess && (
                    <p className="text-[10px] text-emerald-400 font-bold mb-3 animate-pulse">✓ Impostazioni sviluppatore salvate correttamente!</p>
                )}
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="w-full bg-gradient-to-r from-gold-primary via-gold-light to-gold-dark text-black py-3 px-6 rounded-xl text-xs font-extrabold tracking-widest transition-all duration-300 hover:brightness-110 shadow-[0_4px_15px_rgba(212,175,55,0.15)] flex items-center justify-center gap-2 cursor-pointer uppercase"
                >
                  <Save className="w-4 h-4 text-black" />
                  {isSavingConfig ? 'Salvataggio...' : 'Salva Impostazioni'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 text-left"
          >
            <div className="bg-[#0A0A0C] border border-white/5 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-primary font-extrabold mb-5 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gold-primary" /> CHIAVI DI ACCESSO & PIN DI SICUREZZA
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-4 bg-red-500/5 rounded-xl border border-red-500/10 shadow-inner">
                  <div>
                    <span className="text-[11px] text-stone-200 font-extrabold block uppercase tracking-wider">👑 Master Owner (PIN)</span>
                    <span className="text-[9px] text-red-400 font-mono font-bold uppercase tracking-widest">Accesso Dashboard Totale</span>
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={localPins.owner || ''}
                    onChange={(e) => setLocalPins({ ...localPins, owner: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="w-24 bg-black/60 border border-red-500/30 text-center font-mono text-lg rounded-xl py-2.5 text-red-500 font-bold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 tracking-[0.25em]"
                  />
                </div>
                
                {Object.keys(localNames)
                  .filter(k => k.startsWith('chair'))
                  .sort((a,b) => a.localeCompare(b))
                  .map((key) => {
                    const num = key.replace('chair', '');
                    return (
                      <div key={key} className="flex items-center justify-between gap-4 p-3.5 bg-black/25 rounded-xl border border-white/5 hover:border-gold-primary/10 transition-all">
                        <div>
                          <span className="text-[11px] text-stone-300 font-bold block uppercase tracking-wide">{localNames[key]}</span>
                          <span className="text-[9px] text-stone-500 font-mono font-bold tracking-widest">Postazione 0{num}</span>
                        </div>
                        <input
                          type="text"
                          maxLength={4}
                          value={localPins[key] || ''}
                          onChange={(e) => setLocalPins({ ...localPins, [key]: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                          className="w-24 bg-black/50 border border-white/5 text-center font-mono text-sm rounded-xl py-2.5 text-stone-200 outline-none focus:border-gold-primary/50 focus:ring-1 focus:ring-gold-primary/15 tracking-[0.25em]"
                        />
                      </div>
                    );
                  })}
              </div>

              <div className="mt-8 pt-5 border-t border-white/5">
                {pinError && <p className="text-[10px] text-red-400 font-bold mb-3">⚠️ {pinError}</p>}
                {pinSaveSuccess && <p className="text-[10px] text-emerald-400 font-bold mb-3 animate-pulse">✓ Codici PIN salvati nel database con successo!</p>}
                <button
                  onClick={handleSavePins}
                  disabled={isSavingPins}
                  className="w-full bg-gradient-to-r from-red-700 to-red-500 hover:brightness-110 text-white py-3 px-6 rounded-xl text-xs font-extrabold transition-all duration-300 uppercase tracking-widest shadow-[0_4px_15px_rgba(220,38,38,0.15)] cursor-pointer"
                >
                  {isSavingPins ? 'Salvataggio...' : 'Salva Nuove Chiavi PIN'}
                </button>
              </div>
            </div>

            <div className="bg-[#0A0A0C] border border-white/5 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-primary font-extrabold mb-4">TOKEN ACCESSO DIRETTO SVILUPPATORE</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[9px] uppercase tracking-widest text-stone-500 font-extrabold ml-1">Admin Direct Token URL</span>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-[10px] text-stone-400 font-mono truncate select-all">
                      {getFullLink('?role=owner')}
                    </div>
                    <button
                      onClick={() => handleCopy('owner', getFullLink('?role=owner'))}
                      className="bg-gold-primary/10 hover:bg-gold-primary/20 text-gold-primary hover:text-white px-5 py-3 rounded-xl text-[10px] uppercase tracking-widest font-extrabold transition-all border border-gold-primary/20 cursor-pointer"
                    >
                      {copiedKey === 'owner' ? 'Copiato' : 'Copia Link'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onBack}
        className="text-[#8E8E93] hover:text-gold-primary text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer font-bold mt-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Esci dalla Dashboard
      </button>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-stone-950 border border-red-500/30 p-8 rounded-3xl text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-stone-100 mb-2 uppercase tracking-wide">Reset Totale</h3>
              <p className="text-sm text-stone-400 font-sans mb-8 leading-relaxed">
                Questa operazione azzererà tutti gli incassi e la cronologia di tutte le poltrone. Vuoi procedere?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-white/5 text-stone-400 font-bold py-3 rounded-xl text-xs uppercase tracking-widest border border-white/5"
                >
                  Annulla
                </button>
                <button
                  onClick={handleReset}
                  disabled={isResetting}
                  className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-red-900/20"
                >
                  {isResetting ? 'Sincronizzazione...' : 'Sì, Confermo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showResetAfterExportConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/85 backdrop-blur-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-stone-950 border border-amber-500/30 p-8 rounded-3xl text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-amber-950/30 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-stone-100 mb-2 uppercase tracking-wide">Esportazione OK</h3>
              <p className="text-xs tracking-widest text-amber-500 font-bold uppercase mb-4">Reset Giornaliero</p>
              <p className="text-sm text-stone-400 font-sans mb-8 leading-relaxed">
                Esportazione completata con successo!<br />
                Desideri procedere ora con il <strong>reset degli incassi giornalieri</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetAfterExportConfirm(false)}
                  className="flex-1 bg-white/5 text-stone-400 font-bold py-3 rounded-xl text-xs uppercase tracking-widest border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  No, Mantieni
                </button>
                <button
                  onClick={handleReset}
                  disabled={isResetting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-3 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-amber-900/20 cursor-pointer transition-colors"
                >
                  {isResetting ? 'Azzzeramento...' : 'Sì, Reset'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
