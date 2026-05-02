import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Library, 
  Upload as UploadIcon, 
  Search, 
  Settings, 
  BookOpen,
  Menu,
  X,
  ChevronRight,
  Plus,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  Heart,
  Facebook,
  Send,
  MessageCircle,
  ExternalLink,
  Users,
  Globe,
  ArrowUp,
  Zap,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

import { UploadPage } from './components/Upload';
import { AddChapterPage } from './components/AddChapter';
import { ReaderPage } from './components/Reader';
import { MangaDetailPage } from './components/MangaDetail';
import { SearchPage } from './components/Search';

import { MangaCard } from './components/MangaCard';

import { SettingsPage } from './components/Settings';
import { LibraryPage } from './components/Library';
import { EditMangaPage } from './components/EditManga';
import { AfterCredit } from './components/AfterCredit';
import { NotFound } from './components/NotFound';
import { APP_CONFIG } from './config';
import { 
  auth, 
  db, 
  doc, 
  getDoc,
  signIn, 
  logOut, 
  onAuthStateChanged, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  User, 
  limit, 
  startAfter, 
  getDocs, 
  getCountFromServer, 
  updateDoc, 
  increment, 
  setDoc, 
  where, 
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from './firebase';

// Auth Context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  errors: any[];
  clearErrors: () => void;
  onlineCount: number;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false,
  errors: [],
  clearErrors: () => {},
  onlineCount: 0
});

export const useAuth = () => useContext(AuthContext);

// Theme Logic
export type Theme = 'light' | 'neutral' | 'dark' | 'system';

const applyTheme = (theme: Theme) => {
  const root = window.document.documentElement;
  const body = window.document.body;
  root.classList.remove('light', 'neutral', 'dark');
  body.classList.remove('light', 'neutral', 'dark');
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
    body.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
    body.classList.add(theme);
  }
};

// Access Guard Component
const AccessGuard = ({ children }: { children: React.ReactNode }) => {
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);
  const [blockReason, setBlockReason] = useState<'geo' | 'ip' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // 1. Get Client IP & Country via serverless proxy
        let clientIp = '';
        let clientCountry = '';
        try {
          const ipRes = await fetch('/api/ip');
          if (ipRes.ok) {
            const data = await ipRes.json() as { ip: string, country?: string };
            clientIp = data.ip;
            clientCountry = data.country || '';
          }
        } catch (e) {
          console.warn('Backend IP API not available, using fallback.');
        }

        if (clientIp) {
          // 2. Check Firestore for specific IP ban
          const ipDocId = clientIp.replace(/\./g, '_').replace(/:/g, '_');
          const ipSnap = await getDoc(doc(db, 'blocked_ips', ipDocId));
          
          if (ipSnap.exists()) {
            setBlockReason('ip');
            setIsBlocked(true);
            setLoading(false);
            return;
          }
        }

        // 3. Geo Blocking (Prioritize internal API country, fallback to external if needed)
        let processedCountryCode = clientCountry;
        
        if (!processedCountryCode || processedCountryCode === 'Unknown') {
          try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json() as any;
            processedCountryCode = data.country_code;
            if (!clientIp) clientIp = data.ip;
          } catch (e) {
            console.error('Geo API fallback failed:', e);
          }
        }

        const blockedCountries = APP_CONFIG.blockedCountries;
        if (blockedCountries.length > 0 && processedCountryCode && blockedCountries.includes(processedCountryCode)) {
          setBlockReason('geo');
          setIsBlocked(true);
        } else {
          setIsBlocked(false);
        }
      } catch (error) {
        console.error('Access check failed:', error);
        setIsBlocked(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-app)] flex flex-col items-center justify-center p-8 text-center uppercase tracking-tighter">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md space-y-6"
        >
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={48} className="text-red-500" />
          </div>
          <h1 className="text-3xl font-black">{blockReason === 'ip' ? 'BẠN ĐÃ BỊ KHÓA TRUY CẬP' : 'TRUY CẬP BỊ HẠN CHẾ'}</h1>
          <p className="text-gray-400 leading-relaxed font-bold normal-case">
            {blockReason === 'ip' 
              ? "Địa chỉ IP của bạn đã bị hệ thống ghi nhận có hành vi bất thường hoặc spam. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là một sự nhầm lẫn."
              : `Rất tiếc, dịch vụ ${APP_CONFIG.appName} hiện không khả dụng tại khu vực của bạn (${APP_CONFIG.blockedCountries.join(', ')}) do chính sách bản quyền và quy định khu vực.`
            }
          </p>
          <div className="pt-8 border-t border-[var(--border-app)]">
            <p className="text-xs text-gray-500 tracking-widest font-bold font-mono">SYSTEM_CODE: {blockReason?.toUpperCase()}_BAN</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};

// Placeholder components
const HomePage = () => {
  const [mangas, setMangas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchTotal = async () => {
      try {
        const snapshot = await getCountFromServer(collection(db, 'mangas'));
        setTotalCount(snapshot.data().count);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'mangas');
        console.error("Error fetching manga count:", error);
      }
    };
    fetchTotal();
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'mangas'), 
      orderBy('updatedAt', 'desc'),
      limit(12)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mangaData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setMangas(mangaData);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'mangas');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'mangas'),
        orderBy('updatedAt', 'desc'),
        startAfter(lastDoc),
        limit(12)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const newMangas = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setMangas(prev => [...prev, ...newMangas]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'mangas');
      console.error("Error loading more mangas:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'team'), (docSnap) => {
      if (docSnap.exists()) {
        setTeamInfo(docSnap.data());
      } else {
        setTeamInfo(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/team');
    });
    return () => unsubscribe();
  }, []);

  const hasTeamData = teamInfo && (
    teamInfo.facebook || 
    teamInfo.discord || 
    teamInfo.telegram || 
    teamInfo.website || 
    teamInfo.donateQR
  );

  return (
    <div className="p-4 sm:p-8 relative overflow-hidden min-h-screen">
      {/* Subtle Background Ripple - Hidden on mobile for performance */}
      <div className="hidden sm:block absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 -right-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] blur-3xl"
        />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Trang chủ</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            {mangas.length} bộ truyện
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mangas.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-8">
            {mangas.map((manga, i) => (
              <MangaCard 
                key={manga.id}
                id={manga.id}
                title={manga.title}
                author={manga.author}
                coverUrl={manga.coverUrl}
                rating={manga.rating}
                viewCount={manga.viewCount}
                updatedAt={manga.updatedAt}
                delay={i * 0.05}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[var(--card-app)]/30 rounded-3xl border border-dashed border-[var(--border-app)]">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">Chưa có truyện nào được tải lên.</p>
            <Link to="/upload" className="inline-block mt-4 text-primary font-bold hover:underline">Tải truyện ngay</Link>
          </div>
        )}

        {totalCount > mangas.length && !loading && (
          <div className="mt-12 flex justify-center">
            <button 
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-10 py-4 bg-[var(--card-app)] border border-[var(--border-app)] rounded-2xl font-bold text-primary hover:border-primary transition-all shadow-lg flex items-center gap-3 disabled:opacity-50"
            >
              {loadingMore && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              Xem thêm truyện ({totalCount - mangas.length})
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, to, active, onClick }: { icon: any, label: string, to: string, active?: boolean, onClick?: () => void }) => (
  <Link 
    to={to}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active ? "bg-primary text-white" : "text-[var(--text-app)] opacity-60 hover:bg-[var(--card-app)] hover:opacity-100"
    )}
  >
    <Icon size={20} className={cn(active ? "text-white" : "group-hover:text-primary")} />
    <span className="font-medium">{label}</span>
  </Link>
);

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  // Direct link from ImgBB for the Avatar image
  const logoUrl = import.meta.env.VITE_LOGO_URL || 'https://i.ibb.co/mL55f6z/logo.png';

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "w-64 h-screen bg-[var(--sidebar-app)] border-l border-[var(--border-app)] flex flex-col fixed right-0 top-0 transition-all duration-300 z-50 lg:translate-x-0 lg:right-0 lg:left-auto lg:border-l lg:border-r-0 overflow-y-auto custom-scrollbar overscroll-contain",
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center justify-between lg:justify-start gap-3 px-8 py-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black tracking-tighter">{APP_CONFIG.appName}</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-[var(--card-app)] rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem icon={Home} label="Trang chủ" to="/" active={location.pathname === '/'} onClick={onClose} />
          <SidebarItem icon={Library} label="Thư viện" to="/library" active={location.pathname === '/library'} onClick={onClose} />
          <SidebarItem icon={Search} label="Tìm kiếm" to="/search" active={location.pathname === '/search'} onClick={onClose} />
          
          {/* 
            CRITICAL: The AfterCredit component is a mandatory part of Zeus's Storage identity.
            Removing or modifying this section is strictly against the author's intent for this open-source project.
          */}
          <AfterCredit />

          {user && isAdmin && (
            <>
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quản lý</div>
              <SidebarItem icon={UploadIcon} label="Tải truyện mới" to="/upload" active={location.pathname === '/upload'} onClick={onClose} />
              <SidebarItem icon={Plus} label="Thêm chương" to="/add-chapter" active={location.pathname === '/add-chapter'} onClick={onClose} />
            </>
          )}
        </nav>
        
        <div className="mt-auto p-4 border-t border-[var(--border-app)] space-y-2 shrink-0">
          {user ? (
            <div className="px-4 py-3 flex items-center gap-3 bg-[var(--card-app)]/50 rounded-xl mb-2">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary">
                <img src={user.photoURL || ''} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user.displayName}</p>
                <button onClick={logOut} className="text-[10px] text-primary font-bold hover:underline">Đăng xuất</button>
              </div>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-primary font-bold hover:bg-primary/10 transition-all"
            >
              <LogIn size={20} />
              <span>Đăng nhập</span>
            </button>
          )}
          <SidebarItem icon={Settings} label="Cài đặt" to="/settings" active={location.pathname === '/settings'} onClick={onClose} />
        </div>
      </div>
    </>
  );
};

const BackToTop = () => {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 z-40 w-12 h-12 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        >
          <ArrowUp size={24} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const [errors, setErrors] = useState<any[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const isAdmin = user?.email === APP_CONFIG.adminEmail;
  const location = useLocation();

  // Inject Primary Color
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', APP_CONFIG.primaryColor);
    root.style.setProperty('--color-primary-dark', APP_CONFIG.primaryColorDark);
  }, []);

  // Presence Heartbeat
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      try {
        await setDoc(doc(db, 'presence', user.uid), {
          lastSeen: serverTimestamp(),
          email: user.email,
          displayName: user.displayName
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `presence/${user.uid}`);
        console.error("Presence update error:", e);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000); // Every 1 minute
    return () => clearInterval(interval);
  }, [user]);

  // Monitor Online Users (Admin only)
  useEffect(() => {
    if (!isAdmin) return;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const q = query(collection(db, 'presence'), where('lastSeen', '>=', fiveMinutesAgo));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOnlineCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'presence');
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Track Page Views
  useEffect(() => {
    const trackView = async () => {
      try {
        const systemRef = doc(db, 'settings', 'system');
        await setDoc(systemRef, { 
          pageViews: increment(1),
          lastVisit: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'settings/system');
        console.error("Track view error:", e);
      }
    };
    trackView();
  }, [location.pathname]);

  // Global Error Listener
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorObj = {
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        time: new Date().toLocaleTimeString(),
        type: 'error'
      };
      setErrors(prev => [errorObj, ...prev].slice(0, 20));
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const errorObj = {
        message: event.reason?.message || String(event.reason),
        time: new Date().toLocaleTimeString(),
        type: 'rejection'
      };
      setErrors(prev => [errorObj, ...prev].slice(0, 20));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const clearErrors = () => setErrors([]);

  // Theme state
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'system';
    applyTheme(savedTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentTheme = localStorage.getItem('theme') as Theme || 'system';
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'team'), (docSnap) => {
      if (docSnap.exists()) {
        setTeamInfo(docSnap.data());
      } else {
        setTeamInfo(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/team');
    });
    return () => unsubscribe();
  }, []);

  // Close sidebar on route change for mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, errors, clearErrors, onlineCount }}>
      <AccessGuard>
        <div className="flex min-h-screen bg-[var(--bg-app)] text-[var(--text-app)]">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          
          <div className="flex-1 flex flex-col lg:mr-64 transition-all duration-300">
            {/* Mobile Header */}
            <header className="lg:hidden h-16 bg-[var(--sidebar-app)]/80 sm:backdrop-blur-md border-b border-[var(--border-app)] flex items-center justify-between px-4 sticky top-0 z-30">
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <span className="font-black tracking-tighter">{APP_CONFIG.appName}</span>
              </Link>
              <div className="flex items-center gap-2">
                {!user && (
                  <button 
                    onClick={signIn}
                    className="p-2 text-primary hover:bg-[var(--card-app)] rounded-lg transition-colors"
                    title="Đăng nhập"
                  >
                    <LogIn size={20} />
                  </button>
                )}
                {user && (
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-primary">
                    <img src={user.photoURL || ''} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                )}
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 hover:bg-[var(--card-app)] rounded-lg text-primary"
                >
                  <Menu size={24} />
                </button>
              </div>
            </header>

            <main className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="min-h-full"
                >
                  <Routes location={location}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/manga/:mangaId" element={<MangaDetailPage />} />
                    <Route path="/read/:mangaId/:chapterId" element={<ReaderPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/add-chapter" element={<AddChapterPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/edit-manga/:mangaId" element={<EditMangaPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>

        {/* Global Team Info Widget */}
        <div className={cn(
          "fixed bottom-6 z-[60] transition-all duration-500",
          "right-6 lg:right-auto lg:left-6" // Move to left on laptop since sidebar is on right
        )}>
          <AnimatePresence>
            {showTeamInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
                className={cn(
                  "absolute bottom-20 w-[300px] bg-[var(--sidebar-app)]/90 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden max-h-[80vh] flex flex-col",
                  "right-0 lg:right-auto lg:left-0"
                )}
              >
                {/* Header with Zen Gradient */}
                <div className="relative p-6 shrink-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent z-0" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl ring-1 ring-primary/20 shadow-inner">
                      <Users size={22} className="text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-lg tracking-tight">Thông tin nhóm</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] opacity-80">Connected with Zeus</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-2 overflow-y-auto custom-scrollbar">
                  {teamInfo?.facebook && (
                    <a href={teamInfo.facebook} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-[20px] transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/20">
                          <Facebook size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">Facebook</span>
                          <span className="text-[10px] text-gray-500 font-medium">Theo dõi tin tức mới</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </a>
                  )}
                  {teamInfo?.discord && (
                    <a href={teamInfo.discord} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-[20px] transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20">
                          <MessageCircle size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">Discord</span>
                          <span className="text-[10px] text-gray-500 font-medium">Tham gia cộng đồng</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </a>
                  )}
                  {teamInfo?.telegram && (
                    <a href={teamInfo.telegram} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-[20px] transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-all shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/20">
                          <Send size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">Telegram</span>
                          <span className="text-[10px] text-gray-500 font-medium">Nhận thông báo nhanh</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </a>
                  )}
                  {teamInfo?.website && (
                    <a href={teamInfo.website} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-[20px] transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-lg shadow-primary/10 ring-1 ring-primary/20">
                          <Globe size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">Website</span>
                          <span className="text-[10px] text-gray-500 font-medium">Ghé thăm trang chủ</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </a>
                  )}

                  {teamInfo?.donateQR && (
                    <div className="mt-4 p-5 bg-primary/5 rounded-[24px] border border-primary/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Zap size={48} className="text-primary" />
                      </div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-primary mb-4 text-center">Ủng hộ nhóm dịch (Donate)</h4>
                      <div className="aspect-square w-full bg-white rounded-2xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.1)] ring-1 ring-black/5">
                        <img src={teamInfo.donateQR} alt="Donate QR" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-4 text-center leading-relaxed font-medium">
                        Sự ủng hộ của bạn là động lực to lớn nhất để nhóm tiếp tục phát triển! ❤️
                      </p>
                    </div>
                  )}

                  {!(teamInfo && (teamInfo.facebook || teamInfo.discord || teamInfo.telegram || teamInfo.website || teamInfo.donateQR)) && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                        <Users size={32} className="text-gray-700 opacity-50" />
                      </div>
                      <p className="text-[11px] text-gray-600 font-bold uppercase tracking-widest italic">Chưa có thông tin liên hệ</p>
                    </div>
                  )}
                </div>
                
                {/* Footer decoration */}
                <div className="p-3 bg-black/20 text-center shrink-0">
                  <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{APP_CONFIG.appName} © 2024</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTeamInfo(!showTeamInfo)}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition-all duration-500",
              showTeamInfo 
                ? "bg-primary text-white rotate-90 rounded-full" 
                : "bg-[var(--sidebar-app)] text-primary border border-[var(--border-app)] hover:border-primary hover:shadow-primary/20"
            )}
          >
            {showTeamInfo ? <X size={28} /> : <Users size={28} />}
          </motion.button>
          <BackToTop />
        </div>
      </AccessGuard>
    </AuthContext.Provider>
  );
}
