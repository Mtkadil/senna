import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { db, auth, handleFirestoreError } from './firebase';
import { OperationType, ScreenType, ServicePrice, AppConfig, AppNotification } from './types';

// Screens
import ScreenHome from './components/ScreenHome';
import ScreenSelection from './components/ScreenSelection';
import ScreenChair from './components/ScreenChair';
import ScreenAdmin from './components/ScreenAdmin';
import ScreenLogin from './components/ScreenLogin';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home-screen');
  const [selectedChair, setSelectedChair] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [chairsData, setChairsData] = useState<{
    [key: string]: {
      total: number;
      history: Array<{ id: string; amount: number; timestamp: string }>;
    };
  }>({});

  const [barberNames, setBarberNames] = useState<{ [key: string]: string }>({
    chair1: 'Caricamento...',
  });

  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    notificationsEnabled: true,
    autoExportEnabled: false,
    exportTime: '23:00',
    features: {
      multiDeviceSync: true,
      darkMode: true,
      extendedHistory: false
    }
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [pinsData, setPinsData] = useState<{ [key: string]: string }>({
    owner: '0000',
  });

  // 1. Initial document check & connection boot
  useEffect(() => {
    async function initDatabaseDocs() {
      // Initialize settings/barbers immediately if missing on Firestore
      try {
        const barbersRef = doc(db, 'settings', 'barbers');
        const barbersSnap = await getDoc(barbersRef);
        if (!barbersSnap.exists()) {
          await setDoc(barbersRef, {
            chair1: 'Amine',
            chair2: 'Maher',
            chair3: 'Adil',
            chair4: 'Kevin',
          });
        }
      } catch (error) {
        console.warn('Initial check for settings/barbers returned:', error);
      }

      // Initialize settings/pins immediately if missing on Firestore
      try {
        const pinsRef = doc(db, 'settings', 'pins');
        const pinsSnap = await getDoc(pinsRef);
        if (!pinsSnap.exists()) {
          await setDoc(pinsRef, {
            owner: '0000',
            chair1: '1111',
            chair2: '2222',
            chair3: '3333',
            chair4: '4444',
          });
        }
      } catch (error) {
        console.warn('Initial check for settings/pins returned:', error);
      }

      // Initialize settings/prices immediately if missing on Firestore
      try {
        const pricesRef = doc(db, 'settings', 'prices');
        const pricesSnap = await getDoc(pricesRef);
        if (!pricesSnap.exists()) {
          await setDoc(pricesRef, {
            list: [
              { id: 'cut', label: 'Taglio', amount: 20 },
              { id: 'beard', label: 'Barba', amount: 10 },
              { id: 'combo', label: 'Taglio + Barba', amount: 25 },
              { id: 'other', label: 'Altro', amount: 5 },
            ]
          });
        }
      } catch (error) {
        console.warn('Initial check for settings/prices returned:', error);
      }

      // Initialize settings/prices immediately if missing on Firestore
      try {
        const appRef = doc(db, 'settings', 'app');
        const appSnap = await getDoc(appRef);
        if (!appSnap.exists()) {
          await setDoc(appRef, {
            notificationsEnabled: true,
            autoExportEnabled: false,
            exportTime: '23:00',
            features: {
              multiDeviceSync: true,
              darkMode: true,
              extendedHistory: false
            }
          });
        }
      } catch (error) {
        console.warn('Initial check for settings/app returned:', error);
      }

      setIsLoading(false);
    }
    initDatabaseDocs();
  }, []);

  // Subscribe to real-time custom PIN adjustments
  useEffect(() => {
    const pathStr = 'settings/pins';
    const unsub = onSnapshot(
      doc(db, 'settings', 'pins'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          setPinsData(data);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathStr);
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to real-time Barber Names
  useEffect(() => {
    const pathStr = 'settings/barbers';
    const unsub = onSnapshot(
      doc(db, 'settings', 'barbers'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          setBarberNames(data);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathStr);
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to real-time Price List
  useEffect(() => {
    const pathStr = 'settings/prices';
    const unsub = onSnapshot(
      doc(db, 'settings', 'prices'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.list)) {
            setPrices(data.list);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathStr);
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to App Config
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
      if (snap.exists()) {
        setAppConfig(snap.data() as AppConfig);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to Notifications
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'notifications'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.list)) {
          setNotifications(data.list);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleUpdatePins = async (newPins: { [key: string]: string }) => {
    try {
      await setDoc(doc(db, 'settings', 'pins'), newPins);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/pins');
    }
  };

  const handleUpdateBarberNames = async (newNames: { [key: string]: string }) => {
    try {
      await setDoc(doc(db, 'settings', 'barbers'), newNames);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/barbers');
    }
  };

  const handleUpdatePrices = async (newPrices: ServicePrice[]) => {
    try {
      await setDoc(doc(db, 'settings', 'prices'), { list: newPrices });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/prices');
    }
  };

  const handleUpdateAppConfig = async (newConfig: AppConfig) => {
    try {
      await setDoc(doc(db, 'settings', 'app'), newConfig);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/app');
    }
  };

  const handleClearNotifications = async () => {
    try {
      await setDoc(doc(db, 'settings', 'notifications'), { list: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/notifications');
    }
  };

  // Logic to generate a notification when a transaction occurs
  useEffect(() => {
    if (!appConfig.notificationsEnabled) return;

    // We only care about NEW additions while the app is active
    // This is a simplified client-side listener for notifications
    // In a real app, a Cloud Function would handle this
    const chairKeys = Object.keys(barberNames).filter(k => k.startsWith('chair'));
    const listeners = chairKeys.map(key => {
      return onSnapshot(doc(db, 'chairs', key), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const history = data.history || [];
        if (history.length > 0) {
          const latest = history[0];
          // Check if this is truly "new" (added in the last 10 seconds)
          const now = new Date();
          const itemTime = new Date(latest.timestamp);
          const diff = now.getTime() - itemTime.getTime();
          
          if (diff < 10000) { // 10 seconds
            const barberName = barberNames[key] || key;
            const newNotif: AppNotification = {
              id: latest.id,
              title: 'Nuovo Incasso',
              message: `${barberName} ha aggiunto +${latest.amount}€`,
              timestamp: latest.timestamp,
              read: false,
              type: 'success'
            };

            // Limit to last 20 notifications and sync to Firestore
            setNotifications(prev => {
              if (prev.some(n => n.id === newNotif.id)) return prev;
              const newList = [newNotif, ...prev].slice(0, 20);
              
              // Persist to Firestore for the admin
              setDoc(doc(db, 'settings', 'notifications'), { list: newList }).catch(err => {
                console.error("Error syncing notifications:", err);
              });

              return newList;
            });
          }
        }
      });
    });

    return () => listeners.forEach(l => l());
  }, [barberNames, appConfig.notificationsEnabled]);

  // 2. Setup real-time subscribers for both security and live data synchronization
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    const chairKeys = Object.keys(barberNames).filter(k => k.startsWith('chair'));

    chairKeys.forEach((key) => {
      const pathStr = `chairs/${key}`;
      const unsub = onSnapshot(
        doc(db, 'chairs', key),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setChairsData((prev) => ({
              ...prev,
              [key]: {
                total: typeof data?.total === 'number' ? data.total : 0,
                history: Array.isArray(data?.history) ? data.history : [],
              },
            }));
          } else {
            // Initialize if missing when someone selects it
            setDoc(doc(db, 'chairs', key), { total: 0, history: [] });
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, pathStr);
        }
      );
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [barberNames]);

  // 3. Process URL Query specifications (?chair=X) & Roles (?role=owner)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chairParam = params.get('chair');
    const roleParam = params.get('role');
    const modeParam = params.get('mode');
    
    const isOwner = roleParam === 'owner' || modeParam === 'admin';
    setIsAdminMode(isOwner);

    if (isOwner) {
      setCurrentScreen('admin-dashboard');
    } else if (chairParam && chairParam.startsWith('chair')) {
      setSelectedChair(parseInt(chairParam.replace('chair', ''), 10) || 1);
      setCurrentScreen('chair-screen');
    } else {
      setCurrentScreen('selection-screen');
    }
  }, []);

  const handleLoginSuccess = (role: 'owner' | 'barber', chairNum?: number) => {
    setIsAuthenticated(true);
    if (role === 'owner') {
      setIsAdminMode(true);
      setCurrentScreen('admin-dashboard');
      window.history.pushState({}, '', '?role=owner');
    } else if (role === 'barber' && chairNum) {
      setIsAdminMode(false);
      setSelectedChair(chairNum);
      setCurrentScreen('chair-screen');
      window.history.pushState({}, '', `?chair=${chairNum}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Error signing out of Google:', err);
    }
    setIsAuthenticated(false);
    setSelectedChair(null);
    setIsAdminMode(false);
    setCurrentScreen('home-screen');
    window.history.pushState({}, '', window.location.pathname);
  };

  // Navigation controller with browser state sync
  const handleNavigate = (screen: ScreenType) => {
    setCurrentScreen(screen);
    if (screen === 'home-screen') {
      setSelectedChair(null);
      if (isAdminMode) {
        window.history.pushState({}, '', '?role=owner');
      } else {
        window.history.pushState({}, '', window.location.pathname);
      }
    }
  };

  const handleSelectChair = (num: number) => {
    setSelectedChair(num);
    setCurrentScreen('chair-screen');
    // Maintain direct chair path so bookmarking works
    window.history.pushState({}, '', `?chair=${num}`);
  };

  const handleAddAmount = async (amount: number) => {
    if (!selectedChair) return;
    const chairKey = `chair${selectedChair}`;
    const currentObj = chairsData[chairKey] || { total: 0, history: [] };
    const newTotal = currentObj.total + amount;

    const newHistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amount,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [newHistoryItem, ...(currentObj.history || [])].slice(0, 500);

    try {
      const chairRef = doc(db, 'chairs', chairKey);
      await setDoc(chairRef, {
        total: newTotal,
        updatedAt: serverTimestamp(),
        history: newHistory,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chairs/${chairKey}`);
    }
  };

  const handleUndoRecentTransaction = async () => {
    if (!selectedChair) return;
    const chairKey = `chair${selectedChair}`;
    const currentObj = chairsData[chairKey] || { total: 0, history: [] };
    const historyList = currentObj.history || [];
    if (historyList.length === 0) return;

    const [recentItem, ...remainingHistory] = historyList;
    const newTotal = Math.max(0, currentObj.total - recentItem.amount);

    try {
      const chairRef = doc(db, 'chairs', chairKey);
      await setDoc(chairRef, {
        total: newTotal,
        updatedAt: serverTimestamp(),
        history: remainingHistory,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chairs/${chairKey}`);
    }
  };

  const handleResetDailyData = async () => {
    const chairKeys = Object.keys(barberNames).filter(k => k.startsWith('chair'));
    for (const chairKey of chairKeys) {
      try {
        const chairRef = doc(db, 'chairs', chairKey);
        await setDoc(chairRef, {
          total: 0,
          updatedAt: serverTimestamp(),
          history: [],
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chairs/${chairKey}`);
      }
    }
  };

  const formattedHeaderDate = new Date().toLocaleDateString('it-IT', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#050506] via-[#0b0a0c] to-[#121013] text-white flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 rounded-full border-t-2 border-gold-primary animate-spin mb-4" />
        <p className="font-serif tracking-wider text-stone-400 text-sm uppercase">Caricamento Salone...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#050506] via-[#0b0a0c] to-[#121013] text-[#F5F5F7] font-sans flex flex-col p-4 md:p-8 overflow-x-hidden relative selection:bg-gold-primary selection:text-black">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-gradient-to-br from-amber-600/10 to-transparent rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] bg-gradient-to-tr from-gold-primary/5 to-transparent rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main layout wrapper */}
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-between py-4 relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-[0.1em] uppercase mb-1 font-sans text-gold-primary">
              Senna Barbershop
            </h1>
            <p className="text-[9px] tracking-[0.3em] uppercase text-[#8E8E93]">
              digital book &bull; Management App
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto items-center">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 px-3.5 py-2 rounded-xl text-[9px] uppercase tracking-widest font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 h-[34px] active:scale-95 duration-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            )}
            <div className="bg-white/5 border border-white/10 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2.5 flex-1 sm:flex-initial h-[34px]">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>
              <span className="text-[9px] uppercase tracking-widest text-[#8E8E93] font-semibold">Live Sync Active</span>
            </div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-center flex-1 sm:flex-initial h-[34px] flex flex-col justify-center">
              <span className="text-[9px] uppercase tracking-widest text-[#8E8E93] block leading-none mb-0.5">Today</span>
              <p className="font-semibold text-[10px] tracking-wider leading-none">{formattedHeaderDate}</p>
            </div>
          </div>
        </header>

        {/* Primary Container card styling with custom boundaries */}
        <div className="w-full max-w-md mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-[0_12px_45px_rgba(0,0,0,0.6)] min-h-[460px] flex flex-col justify-center my-auto">
          <AnimatePresence mode="wait">
            {!isAuthenticated ? (
              <div key="login" className="w-full">
                <ScreenLogin
                  onLoginSuccess={handleLoginSuccess}
                  pinsData={pinsData}
                  barberNames={barberNames}
                />
              </div>
            ) : !isAdminMode ? (
              /* IF BARBER => STRONGLY LOCK TO ASSIGNED CHAIR ONLY! No spy, no navigation */
              <div key="chair" className="w-full">
                <ScreenChair
                  chairNum={selectedChair || 1}
                  barberNames={barberNames}
                  prices={prices}
                  total={chairsData[`chair${selectedChair || 1}`]?.total || 0}
                  history={chairsData[`chair${selectedChair || 1}`]?.history || []}
                  onAddAmount={handleAddAmount}
                  onUndoRecentTransaction={handleUndoRecentTransaction}
                  isAdminMode={false}
                  onExit={() => {}}
                />
              </div>
            ) : currentScreen === 'home-screen' ? (
              <div key="home" className="w-full">
                <ScreenHome
                  onNavigate={(screen) => handleNavigate(screen)}
                />
              </div>
            ) : currentScreen === 'selection-screen' ? (
              <div key="selection" className="w-full">
                <ScreenSelection
                  barberNames={barberNames}
                  onSelectChair={handleSelectChair}
                  isAdminMode={isAdminMode}
                  onBack={() => handleNavigate('home-screen')}
                />
              </div>
            ) : currentScreen === 'chair-screen' && selectedChair !== null ? (
              /* If Admin/Owner is inspecting a poltrona */
              <div key="chair" className="w-full">
                <ScreenChair
                  chairNum={selectedChair}
                  barberNames={barberNames}
                  prices={prices}
                  total={chairsData[`chair${selectedChair}`]?.total || 0}
                  history={chairsData[`chair${selectedChair}`]?.history || []}
                  onAddAmount={handleAddAmount}
                  onUndoRecentTransaction={handleUndoRecentTransaction}
                  isAdminMode={true}
                  onExit={() => {
                    setSelectedChair(null);
                    setCurrentScreen('admin-dashboard');
                    window.history.pushState({}, '', '?role=owner');
                  }}
                />
              </div>
            ) : currentScreen === 'admin-dashboard' ? (
              <div key="admin" className="w-full">
                <ScreenAdmin
                  totals={Object.keys(chairsData).reduce((acc, key) => {
                    acc[key] = chairsData[key].total;
                    return acc;
                  }, {} as { [key: string]: number })}
                  histories={Object.keys(chairsData).reduce((acc, key) => {
                    acc[key] = chairsData[key].history;
                    return acc;
                  }, {} as { [key: string]: Array<{ id: string; amount: number; timestamp: string }> })}
                  onReset={handleResetDailyData}
                  onBack={() => handleNavigate('home-screen')}
                  pinsData={pinsData}
                  onUpdatePins={handleUpdatePins}
                  barberNames={barberNames}
                  onUpdateBarberNames={handleUpdateBarberNames}
                  prices={prices}
                  onUpdatePrices={handleUpdatePrices}
                  appConfig={appConfig}
                  onUpdateAppConfig={handleUpdateAppConfig}
                  notifications={notifications}
                  onClearNotifications={handleClearNotifications}
                />
              </div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Bottom Status Bar */}
        <footer className="flex flex-col sm:flex-row justify-between items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-[#8E8E93] border-t border-[#ffffff]/10 pt-6 mt-8">
          <div className="text-stone-500 font-medium">Creato da Adil Mtk</div>
          <div className="flex gap-4">
            <span>Device ID: SENNA_01_X</span>
            <span className="hidden sm:inline">&bull;</span>
            <span>Secure Connection</span>
          </div>
          <div className="text-[#D4AF37] font-semibold">
            {isAuthenticated 
              ? `Authenticated: ${isAdminMode ? 'Proprietario' : 'Barbiere'}` 
              : 'Lock Stat: Bloccato'}
          </div>
        </footer>
      </div>
    </div>
  );
}
