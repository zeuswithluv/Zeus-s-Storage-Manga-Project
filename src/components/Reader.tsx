import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Settings, 
  List, 
  Layout, 
  Smartphone, 
  Monitor,
  MessageSquare,
  Loader2,
  BookOpen,
  Home,
  ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CommentSection } from './Comments';
import { db, doc, getDoc, collection, query, orderBy, onSnapshot, handleFirestoreError, OperationType } from '../firebase';

type ReaderMode = 'classic' | 'zen';

interface ReaderSettings {
  animations: boolean;
  direction: 'rtl' | 'ltr';
  navPosition: 'normal' | 'swapped';
}

export const ReaderPage = () => {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [manga, setManga] = useState<any>(null);
  const [chapter, setChapter] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ReaderMode>(() => {
    return (localStorage.getItem('readerMode') as ReaderMode) || 'zen';
  });
  const [showChapters, setShowChapters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const toggleChapters = () => {
    setShowChapters(!showChapters);
    if (!showChapters) setShowSettings(false);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
    if (!showSettings) setShowChapters(false);
  };

  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem('readerSettings');
    return saved ? JSON.parse(saved) : {
      animations: true,
      direction: 'rtl',
      navPosition: 'normal'
    };
  });
  
  useEffect(() => {
    localStorage.setItem('readerSettings', JSON.stringify(settings));
  }, [settings]);

  // Track read chapters
  useEffect(() => {
    if (mangaId && chapterId) {
      const readChapters = JSON.parse(localStorage.getItem(`read_${mangaId}`) || '[]');
      if (!readChapters.includes(chapterId)) {
        localStorage.setItem(`read_${mangaId}`, JSON.stringify([...readChapters, chapterId]));
      }
    }
  }, [mangaId, chapterId]);
  
  useEffect(() => {
    if (!mangaId || !chapterId) return;

    setLoading(true);

    const mangaRef = doc(db, 'mangas', mangaId);
    const unsubscribeManga = onSnapshot(mangaRef, (docSnap) => {
      if (docSnap.exists()) setManga(docSnap.data());
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `mangas/${mangaId}`);
    });

    const chapterRef = doc(db, 'mangas', mangaId, 'chapters', chapterId);
    const unsubscribeChapter = onSnapshot(chapterRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setChapter(data);
        setCurrentPage(0);
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `mangas/${mangaId}/chapters/${chapterId}`);
    });

    const chaptersRef = collection(db, 'mangas', mangaId, 'chapters');
    const unsubscribeChapters = onSnapshot(chaptersRef, (snapshot) => {
      let chapterData: any[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort in memory: prioritize sortOrder, fallback to number
      chapterData.sort((a, b) => {
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        if (a.sortOrder !== undefined) return -1;
        if (b.sortOrder !== undefined) return 1;
        return (a.number || 0) - (b.number || 0);
      });

      setChapters(chapterData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `mangas/${mangaId}/chapters`);
    });

    // Scroll to top on chapter change
    if (contentRef.current) {
      contentRef.current.scrollTo(0, 0);
    }

    return () => {
      unsubscribeManga();
      unsubscribeChapter();
      unsubscribeChapters();
    };
  }, [mangaId, chapterId]);

  // Extra safety: scroll to top when chapter content is actually loaded
  useEffect(() => {
    if (chapter && contentRef.current) {
      contentRef.current.scrollTo(0, 0);
    }
  }, [chapter]);

  const currentChapterIndex = chapters.findIndex(c => c.id === chapterId);
  const prevChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex < chapters.length - 1 ? chapters[currentChapterIndex + 1] : null;

  const navigateToChapter = (id: string) => {
    navigate(`/read/${mangaId}/${id}`);
  };

  const pages = chapter?.pages || [];

  // Preload next pages in Zen mode
  useEffect(() => {
    if (mode === 'zen' && currentPage < pages.length - 1) {
      const nextImg = new Image();
      nextImg.src = pages[currentPage + 1];
      
      // Preload one more if possible
      if (currentPage < pages.length - 2) {
        const afterNextImg = new Image();
        afterNextImg.src = pages[currentPage + 2];
      }
    }
  }, [currentPage, pages, mode]);

  const nextPage = () => {
    if (currentPage < pages.length) setCurrentPage(prev => prev + 1);
  };

  const prevPage = () => {
    if (currentPage > 0) setCurrentPage(prev => prev - 1);
  };

  const handleNavClick = (type: 'next' | 'prev') => {
    if (settings.direction === 'rtl') {
      type === 'next' ? nextPage() : prevPage();
    } else {
      type === 'next' ? prevPage() : nextPage();
    }
  };

  useEffect(() => {
    localStorage.setItem('readerMode', mode);
    if (pages.length > 0) {
      setCurrentPage(0);
    }
  }, [mode, pages.length]);

  useEffect(() => {
    if (mode === 'zen') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') nextPage();
        if (e.key === 'ArrowRight') prevPage();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentPage, mode]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (mode === 'classic') {
      setShowScrollTop(e.currentTarget.scrollTop > 500);
    }
  };

  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 bg-[var(--bg-app)] z-[60] flex flex-col",
      isFullscreen ? "p-0" : "p-0"
    )}>
      {/* Header */}
      <div className="h-14 sm:h-16 bg-[var(--sidebar-app)]/90 sm:backdrop-blur-md border-b border-[var(--border-app)] flex items-center justify-between px-3 sm:px-6 shrink-0 z-30">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-full transition-colors text-white" title="Quay lại">
              <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
            </button>
            <button onClick={() => navigate('/')} className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-full transition-colors text-white" title="Trang chủ">
              <Home size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
          <div className="hidden sm:block">
            <h2 className="font-bold text-sm text-white">{manga?.title || 'Đang tải...'}</h2>
            <p className="text-xs text-gray-400">Chương {chapter?.number || '...'}</p>
          </div>
          <div className="sm:hidden">
            <h2 className="font-bold text-[10px] text-white truncate max-w-[80px]">{manga?.title || '...'}</h2>
            <p className="text-[8px] text-gray-400">Ch. {chapter?.number || '...'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-4">
          {/* Mode Toggle */}
          <div className="flex bg-[var(--card-app)] rounded-lg p-0.5 sm:p-1">
            <button 
              onClick={() => setMode('classic')}
              className={cn(
                "p-1 sm:p-1.5 rounded-md transition-all flex items-center gap-1 sm:gap-2 px-2 sm:px-3",
                mode === 'classic' ? "bg-primary text-white shadow-lg" : "text-gray-400 hover:text-[var(--text-app)]"
              )}
              title="Classic UI (Cuộn dọc)"
            >
              <Smartphone size={14} className="sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-bold hidden md:block">Classic</span>
            </button>
            <button 
              onClick={() => setMode('zen')}
              className={cn(
                "p-1 sm:p-1.5 rounded-md transition-all flex items-center gap-1 sm:gap-2 px-2 sm:px-3",
                mode === 'zen' ? "bg-primary text-white shadow-lg" : "text-gray-400 hover:text-[var(--text-app)]"
              )}
              title="Zen UI (Đọc ngang)"
            >
              <Monitor size={14} className="sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-bold hidden md:block">Zen</span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              disabled={!prevChapter}
              onClick={() => prevChapter && navigateToChapter(prevChapter.id)}
              className={cn(
                "p-1.5 sm:p-2 rounded-full transition-colors",
                prevChapter ? "hover:bg-gray-800 text-white" : "text-gray-600 cursor-not-allowed"
              )}
              title="Chương trước"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              disabled={!nextChapter}
              onClick={() => nextChapter && navigateToChapter(nextChapter.id)}
              className={cn(
                "p-1.5 sm:p-2 rounded-full transition-colors",
                nextChapter ? "hover:bg-gray-800 text-white" : "text-gray-600 cursor-not-allowed"
              )}
              title="Chương sau"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="h-4 sm:h-6 w-px bg-gray-800 mx-1 sm:mx-2" />

          <div className="relative">
            <button 
              onClick={toggleChapters}
              className={cn(
                "p-1.5 sm:p-2 hover:bg-gray-800 rounded-full transition-colors text-white",
                showChapters && "bg-gray-800 text-primary"
              )}
            >
              <List size={18} className="sm:w-5 sm:h-5" />
            </button>

            <AnimatePresence>
              {showChapters && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-12 right-0 w-64 bg-[var(--sidebar-app)] border border-[var(--border-app)] rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-[var(--border-app)] bg-[var(--card-app)]/50">
                    <h3 className="font-bold text-sm">Danh sách chương</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {chapters.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          navigateToChapter(c.id);
                          setShowChapters(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex justify-between items-center",
                          c.id === chapterId 
                            ? "bg-primary/10 text-primary font-bold" 
                            : "text-gray-400 hover:bg-[var(--card-app)] hover:text-[var(--text-app)]"
                        )}
                      >
                        <span>Chương {c.number}</span>
                        {c.id === chapterId && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button 
              onClick={toggleSettings}
              className={cn(
                "p-1.5 sm:p-2 hover:bg-gray-800 rounded-full transition-colors text-white",
                showSettings && "bg-gray-800 text-primary"
              )}
            >
              <Settings size={18} className="sm:w-5 sm:h-5" />
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-12 right-0 w-72 bg-[var(--sidebar-app)] border border-[var(--border-app)] rounded-2xl shadow-2xl overflow-hidden z-50 p-4 space-y-4"
                >
                  <h3 className="font-bold text-sm border-b border-[var(--border-app)] pb-2">Cài đặt trình đọc</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Hiệu ứng chuyển trang</span>
                      <button 
                        onClick={() => setSettings(s => ({ ...s, animations: !s.animations }))}
                        className={cn(
                          "w-10 h-5 rounded-full transition-colors relative",
                          settings.animations ? "bg-primary" : "bg-gray-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                          settings.animations ? "left-6" : "left-1"
                        )} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Hướng đọc (Zen)</span>
                      <div className="flex bg-[var(--card-app)] rounded-lg p-1">
                        <button 
                          onClick={() => setSettings(s => ({ ...s, direction: 'rtl' }))}
                          className={cn("px-2 py-1 text-[10px] rounded-md", settings.direction === 'rtl' ? "bg-primary text-white" : "text-gray-500")}
                        >
                          Phải-Trái
                        </button>
                        <button 
                          onClick={() => setSettings(s => ({ ...s, direction: 'ltr' }))}
                          className={cn("px-2 py-1 text-[10px] rounded-md", settings.direction === 'ltr' ? "bg-primary text-white" : "text-gray-500")}
                        >
                          Trái-Phải
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Vị trí nút Next (Zen)</span>
                      <div className="flex bg-[var(--card-app)] rounded-lg p-1">
                        <button 
                          onClick={() => setSettings(s => ({ ...s, navPosition: 'normal' }))}
                          className={cn("px-2 py-1 text-[10px] rounded-md", settings.navPosition === 'normal' ? "bg-primary text-white" : "text-gray-500")}
                        >
                          Mặc định
                        </button>
                        <button 
                          onClick={() => setSettings(s => ({ ...s, navPosition: 'swapped' }))}
                          className={cn("px-2 py-1 text-[10px] rounded-md", settings.navPosition === 'swapped' ? "bg-primary text-white" : "text-gray-500")}
                        >
                          Đảo ngược
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-full transition-colors text-white hidden sm:block"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div 
        ref={contentRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-y-auto bg-[var(--bg-app)] relative custom-scrollbar scroll-smooth",
          mode === 'zen' ? "flex justify-center items-center" : "pt-4 pb-20"
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        ) : mode === 'zen' ? (
          <div className="w-full h-full flex items-center justify-center relative group">
            <AnimatePresence mode="wait">
              {currentPage < pages.length ? (
                <motion.img 
                  key={currentPage}
                  initial={settings.animations ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  exit={settings.animations ? { opacity: 0 } : false}
                  transition={{ duration: 0.15 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 50) {
                      // Swipe Right
                      settings.direction === 'rtl' ? prevPage() : nextPage();
                    } else if (info.offset.x < -50) {
                      // Swipe Left
                      settings.direction === 'rtl' ? nextPage() : prevPage();
                    }
                  }}
                  src={pages[currentPage]} 
                  alt={`Page ${currentPage + 1}`}
                  className="max-h-full w-auto shadow-2xl object-contain cursor-grab active:cursor-grabbing"
                  referrerPolicy="no-referrer"
                  // @ts-ignore
                  fetchPriority="high"
                />
              ) : (
                <motion.div 
                  key="end-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-8 p-12 bg-[var(--card-app)]/50 rounded-3xl border border-[var(--border-app)] backdrop-blur-xl"
                >
                  <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                    <BookOpen size={40} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-black mb-2">Hết chương {chapter?.number}</h3>
                    <p className="text-gray-500">Bạn đã hoàn thành chương này!</p>
                  </div>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setCurrentPage(pages.length - 1)}
                      className="px-6 py-3 bg-[var(--card-app)] text-gray-400 rounded-xl font-bold hover:text-[var(--text-app)] transition-all"
                    >
                      Xem lại trang cuối
                    </button>
                    {nextChapter && (
                      <button 
                        onClick={() => navigateToChapter(nextChapter.id)}
                        className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all"
                      >
                        Chương tiếp theo
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Overlays (Zen Mode) */}
            <div 
              className={cn(
                "absolute inset-y-0 w-1/3 sm:w-1/4 cursor-pointer z-10 group-hover:bg-white/5 transition-colors flex items-center opacity-0 sm:group-hover:opacity-100",
                settings.navPosition === 'normal' ? "left-0 justify-start pl-4" : "right-0 justify-end pr-4"
              )} 
              onClick={() => handleNavClick('next')}
            >
              <div className="p-2 sm:p-3 bg-black/50 rounded-full text-white">
                {settings.navPosition === 'normal' ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
              </div>
            </div>
            <div 
              className={cn(
                "absolute inset-y-0 w-1/3 sm:w-1/4 cursor-pointer z-10 group-hover:bg-white/5 transition-colors flex items-center opacity-0 sm:group-hover:opacity-100",
                settings.navPosition === 'normal' ? "right-0 justify-end pr-4" : "left-0 justify-start pl-4"
              )} 
              onClick={() => handleNavClick('prev')}
            >
              <div className="p-2 sm:p-3 bg-black/50 rounded-full text-white">
                {settings.navPosition === 'normal' ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-0 px-0 sm:px-4">
            {prevChapter && (
              <div className="py-8 flex justify-center px-4">
                <button 
                  onClick={() => navigateToChapter(prevChapter.id)}
                  className="px-6 py-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white hover:border-primary transition-all flex items-center gap-2"
                >
                  <ChevronLeft size={18} />
                  Chương trước: {prevChapter.number}
                </button>
              </div>
            )}

            {pages.map((url, idx) => (
              <div key={idx} className="relative min-h-[400px] bg-[var(--card-app)]/20 flex items-center justify-center">
                <img 
                  src={url} 
                  alt={`Page ${idx + 1}`} 
                  className="w-full h-auto shadow-xl relative z-10"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onLoad={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.parentElement?.classList.remove('bg-[var(--card-app)]/20');
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center z-0">
                  <Loader2 className="animate-spin text-gray-800" size={24} />
                </div>
              </div>
            ))}
            <div className="py-10 text-center text-gray-500 text-sm italic">
              --- Hết chương ---
            </div>

            {nextChapter && (
              <div className="py-12 flex flex-col items-center gap-6">
                <div className="text-gray-500 text-sm">Bạn đã đọc hết chương này</div>
                <button 
                  onClick={() => navigateToChapter(nextChapter.id)}
                  className="px-10 py-4 bg-primary text-white rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                >
                  <span>Chương tiếp theo: {nextChapter.number}</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Progress (Zen Mode only - RTL) */}
      {mode === 'zen' && (
        <div className="h-1 bg-gray-800 w-full shrink-0 flex justify-end">
          <motion.div 
            className="h-full bg-primary shadow-[0_0_10px_rgba(26,188,156,0.5)]" 
            animate={{ width: `${pages.length > 0 ? (Math.min(currentPage + 1, pages.length) / pages.length) * 100 : 0}%` }}
          />
        </div>
      )}
      
      <CommentSection mangaId={mangaId || ''} isReader />

      {/* Back to Top Button */}
      <AnimatePresence>
        {mode === 'classic' && showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="fixed bottom-24 left-6 z-40 w-12 h-12 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
            title="Lên đầu chương"
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
