import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Check, Key, Save, AlertCircle, Users, Facebook, Send, MessageCircle, Globe, BarChart3, Book, Layers, MessageSquare, Trash2, ShieldCheck, RefreshCw, Loader2, Activity, AlertTriangle, HardDrive, Zap, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth, Theme } from '../App';
import { APP_CONFIG } from '../config';
import { db, doc, getDoc, setDoc, serverTimestamp, collection, getCountFromServer, collectionGroup, getDocs, writeBatch, query, orderBy, onSnapshot, handleFirestoreError, OperationType } from '../firebase';

const SystemMonitor = () => {
  const { errors, clearErrors, onlineCount } = useAuth();
  const [systemData, setSystemData] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState({ local: 0, firestore: 0 });
  const [isFixing, setIsFixing] = useState(false);
  const [counts, setCounts] = useState({ mangas: 0, chapters: 0, comments: 0, follows: 0, ratings: 0 });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'system'), (docSnap) => {
      if (docSnap.exists()) setSystemData(docSnap.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/system');
    });

    const fetchCounts = async () => {
      try {
        const [mSnap, cSnap, cmSnap, fSnap, rSnap] = await Promise.all([
          getCountFromServer(collection(db, 'mangas')),
          getCountFromServer(collectionGroup(db, 'chapters')),
          getCountFromServer(collectionGroup(db, 'comments')),
          getCountFromServer(collection(db, 'follows')),
          getCountFromServer(collection(db, 'ratings'))
        ]);
        
        const mCount = mSnap.data().count;
        const cCount = cSnap.data().count;
        const cmCount = cmSnap.data().count;
        const fCount = fSnap.data().count;
        const rCount = rSnap.data().count;

        setCounts({ mangas: mCount, chapters: cCount, comments: cmCount, follows: fCount, ratings: rCount });

        // Estimate Firestore Storage
        // Mangas: ~1KB, Chapters: ~2KB, Comments: ~0.5KB, Others: ~0.2KB
        const estimatedBytes = (mCount * 1024) + (cCount * 2048) + (cmCount * 512) + (fCount * 256) + (rCount * 256);
        setStorageInfo(prev => ({ ...prev, firestore: estimatedBytes }));
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'multiple/counts');
        console.error("Fetch counts error:", e);
      }
    };

    fetchCounts();

    // Calculate LocalStorage usage
    let total = 0;
    for (let x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        total += ((localStorage[x].length + x.length) * 2);
      }
    }
    setStorageInfo(prev => ({ ...prev, local: total }));

    return () => unsubscribe();
  }, []);

  const handleAutoFix = async () => {
    setIsFixing(true);
    try {
      // 1. Clear non-essential localStorage
      const keysToKeep = ['theme', 'imgbb_api_key', 'readerSettings'];
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) localStorage.removeItem(key);
      });

      // 2. Re-verify Firebase connection (simple ping)
      await getDoc(doc(db, 'settings', 'system'));

      // 3. Clear error log
      clearErrors();

      setSuccessMessage('Đã hoàn tất tự động sửa lỗi: Đã dọn dẹp bộ nhớ đệm và kiểm tra kết nối hệ thống.');
    } catch (e) {
      setSuccessMessage('Có lỗi xảy ra khi tự động sửa lỗi.');
    } finally {
      setIsFixing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const FIRESTORE_FREE_LIMIT = 1024 * 1024 * 1024; // 1GB

  return (
    <div className="space-y-6">
      {/* Traffic & Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 bg-[var(--card-app)] border border-[var(--border-app)] rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-sm">Người dùng trực tuyến</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-2xl font-black">{onlineCount}</span>
              <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Đang hoạt động</span>
            </div>
            <div className="text-[10px] text-gray-400">
              Tổng lượt xem web: {systemData?.pageViews?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        <div className="p-6 bg-[var(--card-app)] border border-[var(--border-app)] rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-sm">Trạng thái hệ thống</h3>
            </div>
            <button 
              onClick={handleAutoFix}
              disabled={isFixing}
              className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg hover:bg-primary hover:text-white transition-all flex items-center gap-1"
            >
              <Zap size={10} className={cn(isFixing && "animate-pulse")} />
              {isFixing ? "ĐANG FIX..." : "FIX TỰ ĐỘNG"}
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", errors.length > 0 ? "bg-red-500 animate-pulse" : "bg-green-500")} />
              <span className="text-sm font-bold">{errors.length > 0 ? `Phát hiện ${errors.length} lỗi mới` : "Hệ thống ổn định"}</span>
            </div>
            <p className="text-[10px] text-gray-500">Bấm "Fix tự động" nếu web bị lag hoặc lỗi ảnh.</p>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="p-6 bg-[var(--card-app)] border border-[var(--border-app)] rounded-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
            <HardDrive size={20} />
          </div>
          <h3 className="font-bold text-sm">Dung lượng Web (Storage)</h3>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span>Bộ nhớ đệm (LocalStorage)</span>
              <span className="text-gray-500">{formatBytes(storageInfo.local)} / 5MB</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((storageInfo.local / (5 * 1024 * 1024)) * 100, 100)}%` }}
                className="h-full bg-purple-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span>Dữ liệu Firestore (Ước tính)</span>
              <span className="text-gray-500">{formatBytes(storageInfo.firestore)} / 1GB</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((storageInfo.firestore / FIRESTORE_FREE_LIMIT) * 100, 100)}%` }}
                className="h-full bg-primary"
              />
            </div>
            <div className="flex justify-between text-[9px] text-gray-500 italic">
              <span>Còn lại: {formatBytes(Math.max(FIRESTORE_FREE_LIMIT - storageInfo.firestore, 0))} miễn phí</span>
              <span>Dựa trên {counts.mangas + counts.chapters + counts.comments + counts.follows + counts.ratings} tài liệu</span>
            </div>
          </div>
        </div>

        {/* Upgrade Section for Open Source Admins */}
        <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-white">
              <Zap size={18} />
            </div>
            <div>
              <div className="text-xs font-bold">Nâng cấp Firebase (Blaze Plan)</div>
              <div className="text-[10px] text-gray-500">Mở rộng giới hạn để gánh được lượng người đọc lớn hơn.</div>
            </div>
          </div>
          <a 
            href="https://console.firebase.google.com/project/_/usage/details" 
            target="_blank" 
            rel="noreferrer"
            className="w-full sm:w-auto px-4 py-2 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            Nâng cấp ngay
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Error Logs */}
      {errors.length > 0 && (
        <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-red-500 flex items-center gap-2">
              <AlertCircle size={16} />
              Nhật ký lỗi gần đây
            </h3>
            <button onClick={clearErrors} className="text-[10px] font-bold text-gray-500 hover:text-red-500 transition-colors">Xóa nhật ký</button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
            {errors.map((err, i) => (
              <div key={i} className="p-2 bg-red-500/10 rounded-lg border border-red-500/10 text-[10px] font-mono">
                <div className="flex justify-between text-red-400 mb-1">
                  <span className="font-bold">[{err.type.toUpperCase()}]</span>
                  <span>{err.time}</span>
                </div>
                <div className="text-gray-400 break-all">{err.message}</div>
                {err.source && <div className="text-[9px] text-gray-600 mt-1 truncate">{err.source}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SpamManager = () => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'cleaning' | 'done'>('idle');
  const [result, setResult] = useState<{ scanned: number, deleted: number } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'duplicates' | 'spam', title: string, desc: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const cleanDuplicates = async () => {
    setConfirmAction(null);
    setStatus('scanning');
    setResult(null);
    
    try {
      const q = query(collectionGroup(db, 'comments'), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      const allComments = snapshot.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() } as any));
      
      const seen = new Set<string>();
      const toDelete: any[] = [];
      
      allComments.forEach(c => {
        // Create a unique key based on user and content
        const key = `${c.uid}_${c.content.trim().toLowerCase()}`;
        if (seen.has(key)) {
          toDelete.push(c.ref);
        } else {
          seen.add(key);
        }
      });

      if (toDelete.length > 0) {
        setStatus('cleaning');
        // Firestore batch limit is 500
        for (let i = 0; i < toDelete.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = toDelete.slice(i, i + 500);
          chunk.forEach(ref => batch.delete(ref));
          await batch.commit();
        }
      }

      setResult({ scanned: allComments.length, deleted: toDelete.length });
      setStatus('done');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'comments/cleanup');
      console.error("Spam clean error:", error);
      setSuccessMessage('Có lỗi xảy ra khi dọn dẹp.');
      setStatus('idle');
    }
  };

  const cleanSpamPatterns = async () => {
    setConfirmAction(null);
    setStatus('scanning');
    setResult(null);
    
    try {
      const snapshot = await getDocs(collectionGroup(db, 'comments'));
      const allComments = snapshot.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() } as any));
      
      const toDelete: any[] = [];
      
      allComments.forEach(c => {
        const content = c.content.trim();
        
        // Spam patterns
        const isTooShort = content.length < 2;
        const isRepetitive = /(.)\1{9,}/.test(content); // Same character 10+ times
        const isWordRepetitive = /\b(\w+)\b(?:\s+\1\b){4,}/i.test(content); // Same word 5+ times
        
        if (isTooShort || isRepetitive || isWordRepetitive) {
          toDelete.push(c.ref);
        }
      });

      if (toDelete.length > 0) {
        setStatus('cleaning');
        for (let i = 0; i < toDelete.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = toDelete.slice(i, i + 500);
          chunk.forEach(ref => batch.delete(ref));
          await batch.commit();
        }
      }

      setResult({ scanned: allComments.length, deleted: toDelete.length });
      setStatus('done');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'comments/spam-cleanup');
      console.error("Spam clean error:", error);
      alert('Có lỗi xảy ra khi dọn dẹp.');
      setStatus('idle');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          onClick={() => setConfirmAction({
            type: 'duplicates',
            title: 'Xóa bình luận trùng lặp?',
            desc: 'Hệ thống sẽ quét toàn bộ bình luận và xóa các nội dung bị trùng lặp từ cùng một người dùng.'
          })}
          disabled={status !== 'idle' && status !== 'done'}
          className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl hover:bg-orange-500/20 transition-all text-left group"
        >
          <div className="p-2 bg-orange-500 rounded-xl text-white group-hover:scale-110 transition-transform">
            <RefreshCw size={20} className={cn(status === 'scanning' && "animate-spin")} />
          </div>
          <div>
            <div className="text-sm font-bold">Xóa trùng lặp</div>
            <div className="text-[10px] text-gray-500">Xóa các bình luận giống hệt nhau</div>
          </div>
        </button>

        <button 
          onClick={() => setConfirmAction({
            type: 'spam',
            title: 'Dọn dẹp Spam?',
            desc: 'Hệ thống sẽ xóa các bình luận có dấu hiệu spam (nội dung quá ngắn, lặp từ, hoặc chỉ có ký tự đặc biệt).'
          })}
          disabled={status !== 'idle' && status !== 'done'}
          className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-all text-left group"
        >
          <div className="p-2 bg-red-500 rounded-xl text-white group-hover:scale-110 transition-transform">
            <Trash2 size={20} className={cn(status === 'cleaning' && "animate-bounce")} />
          </div>
          <div>
            <div className="text-sm font-bold">Dọn dẹp Spam</div>
            <div className="text-[10px] text-gray-500">Xóa bình luận rác, lặp từ</div>
          </div>
        </button>
      </div>

      {status !== 'idle' && (
        <div className="p-4 bg-[var(--card-app)] border border-[var(--border-app)] rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === 'done' ? <ShieldCheck className="text-green-500" /> : <Loader2 className="animate-spin text-primary" />}
            <span className="text-xs font-medium">
              {status === 'scanning' && "Đang quét dữ liệu..."}
              {status === 'cleaning' && "Đang tiến hành xóa..."}
              {status === 'done' && "Hoàn tất dọn dẹp!"}
            </span>
          </div>
          {result && (
            <div className="text-[10px] text-gray-500">
              Đã quét: {result.scanned} | Đã xóa: <span className="text-red-500 font-bold">{result.deleted}</span>
            </div>
          )}
        </div>
      )}

      {/* Success Message Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2"
          >
            <ShieldCheck size={20} />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-primary/20 rounded-3xl p-8 w-full max-w-md shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} className="text-primary" />
              </div>
              <h3 className="text-2xl font-black mb-4">{confirmAction.title}</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                {confirmAction.desc}
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-4 bg-gray-800 rounded-2xl font-bold hover:bg-gray-700 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={confirmAction.type === 'duplicates' ? cleanDuplicates : cleanSpamPatterns}
                  className="flex-1 py-4 bg-primary rounded-2xl font-bold hover:bg-primary-dark transition-all text-white shadow-xl shadow-primary/20"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminStats = () => {
  const [stats, setStats] = useState({ mangas: 0, chapters: 0, comments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [mangaSnap, chapterSnap, commentSnap] = await Promise.all([
          getCountFromServer(collection(db, 'mangas')),
          getCountFromServer(collectionGroup(db, 'chapters')),
          getCountFromServer(collectionGroup(db, 'comments'))
        ]);
        setStats({
          mangas: mangaSnap.data().count,
          chapters: chapterSnap.data().count,
          comments: commentSnap.data().count
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'multiple/stats');
        console.error("Stats error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="h-24 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl text-center">
        <Book size={20} className="mx-auto mb-2 text-primary" />
        <div className="text-xl font-black">{stats.mangas}</div>
        <div className="text-[10px] text-gray-500 uppercase font-bold">Truyện</div>
      </div>
      <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl text-center">
        <Layers size={20} className="mx-auto mb-2 text-primary" />
        <div className="text-xl font-black">{stats.chapters}</div>
        <div className="text-[10px] text-gray-500 uppercase font-bold">Chương</div>
      </div>
      <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl text-center">
        <MessageSquare size={20} className="mx-auto mb-2 text-primary" />
        <div className="text-xl font-black">{stats.comments}</div>
        <div className="text-[10px] text-gray-500 uppercase font-bold">Bình luận</div>
      </div>
    </div>
  );
};

export const SettingsPage = () => {
  const { isAdmin } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  const [imgbbKey, setImgbbKey] = useState(() => {
    return localStorage.getItem('imgbb_api_key') || '';
  });

  const [teamInfo, setTeamInfo] = useState({
    facebook: '',
    discord: '',
    telegram: '',
    website: '',
    donateQR: ''
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [teamSaveStatus, setTeamSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploadingQR, setUploadingQR] = useState(false);

  useEffect(() => {
    const fetchTeamInfo = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'team'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTeamInfo({
            facebook: data.facebook || '',
            discord: data.discord || '',
            telegram: data.telegram || '',
            website: data.website || '',
            donateQR: data.donateQR || ''
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings/team');
      }
    };
    fetchTeamInfo();
  }, []);

  const applyTheme = (t: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'neutral', 'dark');
    
    if (t === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(t);
    }
  };

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    localStorage.setItem('theme', t);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    let newTheme: Theme = 'neutral';
    if (val === 0) newTheme = 'light';
    else if (val === 1) newTheme = 'neutral';
    else if (val === 2) newTheme = 'dark';
    handleThemeChange(newTheme);
  };

  const getSliderValue = () => {
    if (theme === 'light') return 0;
    if (theme === 'neutral') return 1;
    if (theme === 'dark') return 2;
    return 1; // Default to neutral if system
  };

  const handleSaveKey = () => {
    setSaveStatus('saving');
    localStorage.setItem('imgbb_api_key', imgbbKey);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleSaveTeam = async () => {
    setTeamSaveStatus('saving');
    try {
      await setDoc(doc(db, 'settings', 'team'), {
        ...teamInfo,
        updatedAt: serverTimestamp()
      });
      setTeamSaveStatus('saved');
      setTimeout(() => setTeamSaveStatus('idle'), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/team');
      console.error(error);
      setTeamSaveStatus('idle');
    }
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = imgbbKey || localStorage.getItem('imgbb_api_key');
    if (!apiKey) {
      return;
    }

    setUploadingQR(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json() as any;
      if (data.success) {
        setTeamInfo({ ...teamInfo, donateQR: data.data.url });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUploadingQR(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Cài đặt</h1>
        <p className="text-gray-500">Tùy chỉnh trải nghiệm của bạn trên {APP_CONFIG.appName}.</p>
      </div>

      <section className="space-y-10">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Giao diện</h2>
            <button 
              onClick={() => handleThemeChange(theme === 'system' ? 'neutral' : 'system')}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2",
                theme === 'system' 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-gray-800 text-gray-400 hover:text-white"
              )}
            >
              <Monitor size={14} />
              {theme === 'system' ? "Đang dùng Hệ thống" : "Dùng Hệ thống"}
            </button>
          </div>

          <div className={cn(
            "p-8 bg-[var(--card-app)] rounded-3xl border border-[var(--border-app)] transition-all",
            theme === 'system' && "opacity-50 pointer-events-none grayscale"
          )}>
            <div className="flex justify-between mb-6 px-2">
              <div className="flex flex-col items-center gap-2">
                <Sun size={20} className={cn(theme === 'light' ? "text-primary" : "text-gray-600")} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Sáng</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={cn("w-5 h-5 rounded-full border-2", theme === 'neutral' ? "border-primary bg-primary/20" : "border-gray-600")} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Trung tính</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Moon size={20} className={cn(theme === 'dark' ? "text-primary" : "text-gray-600")} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Tối</span>
              </div>
            </div>

            <div className="relative h-2 bg-gray-800 rounded-full mb-2">
              <input 
                type="range" 
                min="0" 
                max="2" 
                step="1"
                value={getSliderValue()}
                onChange={handleSliderChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <motion.div 
                className="absolute top-0 left-0 h-full bg-primary rounded-full"
                animate={{ width: `${(getSliderValue() / 2) * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              <motion.div 
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-xl border-4 border-primary z-0"
                animate={{ left: `calc(${(getSliderValue() / 2) * 100}% - 12px)` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>
          </div>
          {theme === 'system' && (
            <p className="text-[10px] text-gray-500 mt-3 text-center italic">
              Tắt chế độ Hệ thống để tùy chỉnh thanh kéo giao diện.
            </p>
          )}
        </div>

        {isAdmin && (
          <div className="space-y-10">
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Activity size={20} className="text-primary" />
                Giám sát hệ thống
              </h2>
              <SystemMonitor />
            </div>

            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-primary" />
                Thống kê dữ liệu
              </h2>
              <AdminStats />
            </div>

            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ShieldCheck size={20} className="text-primary" />
                Quản lý Spam & Nội dung
              </h2>
              <SpamManager />
            </div>

            <div>
              <h2 className="text-lg font-bold mb-4">Cấu hình API</h2>
              <div className="p-6 bg-[var(--card-app)] rounded-2xl border border-[var(--border-app)] space-y-4">
                <div className="flex items-center gap-3 text-primary mb-2">
                  <Key size={20} />
                  <h3 className="font-bold">ImgBB API Key</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Dùng để tải ảnh truyện lên máy chủ. Bạn có thể lấy mã này miễn phí tại 
                  <a href="https://api.imgbb.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline ml-1">api.imgbb.com</a>.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="password"
                    value={imgbbKey}
                    onChange={(e) => setImgbbKey(e.target.value)}
                    placeholder="Nhập API Key của bạn..."
                    className="flex-1 bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                  />
                  <button 
                    onClick={handleSaveKey}
                    disabled={saveStatus === 'saving'}
                    className={cn(
                      "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all",
                      saveStatus === 'saved' 
                        ? "bg-green-500 text-white" 
                        : "bg-primary text-white hover:bg-primary-dark"
                    )}
                  >
                    {saveStatus === 'saving' ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : saveStatus === 'saved' ? (
                      <Check size={20} />
                    ) : (
                      <Save size={20} />
                    )}
                    {saveStatus === 'saved' ? "Đã lưu" : "Lưu"}
                  </button>
                </div>
                {!imgbbKey && (
                  <div className="flex items-center gap-2 text-amber-500 text-xs mt-2">
                    <AlertCircle size={14} />
                    <span>Bạn cần mã này để có thể tải truyện lên.</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-4">Thông tin nhóm dịch</h2>
              <div className="p-6 bg-[var(--card-app)] rounded-2xl border border-[var(--border-app)] space-y-6">
                <div className="flex items-center gap-3 text-primary mb-2">
                  <Users size={20} />
                  <h3 className="font-bold">Liên kết mạng xã hội</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                      <Facebook size={12} className="text-blue-500" /> Facebook
                    </label>
                    <input 
                      type="url"
                      value={teamInfo.facebook}
                      onChange={(e) => setTeamInfo({...teamInfo, facebook: e.target.value})}
                      placeholder="https://facebook.com/your-page"
                      className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                      <MessageCircle size={12} className="text-indigo-500" /> Discord
                    </label>
                    <input 
                      type="url"
                      value={teamInfo.discord}
                      onChange={(e) => setTeamInfo({...teamInfo, discord: e.target.value})}
                      placeholder="https://discord.gg/invite-code"
                      className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                      <Send size={12} className="text-sky-500" /> Telegram
                    </label>
                    <input 
                      type="url"
                      value={teamInfo.telegram}
                      onChange={(e) => setTeamInfo({...teamInfo, telegram: e.target.value})}
                      placeholder="https://t.me/your-channel"
                      className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                      <Globe size={12} className="text-primary" /> Website khác
                    </label>
                    <input 
                      type="url"
                      value={teamInfo.website}
                      onChange={(e) => setTeamInfo({...teamInfo, website: e.target.value})}
                      placeholder="https://your-website.com"
                      className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">QR Donate (Ngân hàng/Ví điện tử)</label>
                    <div className="flex items-center gap-4">
                      {teamInfo.donateQR && (
                        <div className="w-20 h-20 bg-white rounded-lg overflow-hidden border border-gray-800 p-1 shrink-0">
                          <img src={teamInfo.donateQR} alt="QR Donate" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1">
                        <input 
                          type="file" 
                          id="qr-upload" 
                          hidden 
                          accept="image/*"
                          onChange={handleQRUpload}
                        />
                        <button 
                          onClick={() => document.getElementById('qr-upload')?.click()}
                          disabled={uploadingQR}
                          className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                          {uploadingQR ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
                          {teamInfo.donateQR ? "Thay đổi mã QR" : "Tải lên mã QR"}
                        </button>
                        <p className="text-[9px] text-gray-500 mt-2">Tải lên ảnh mã QR ngân hàng hoặc ví điện tử để nhận ủng hộ.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveTeam}
                  disabled={teamSaveStatus === 'saving'}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                    teamSaveStatus === 'saved' 
                      ? "bg-green-500 text-white" 
                      : "bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20"
                  )}
                >
                  {teamSaveStatus === 'saving' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : teamSaveStatus === 'saved' ? (
                    <Check size={20} />
                  ) : (
                    <Save size={20} />
                  )}
                  {teamSaveStatus === 'saved' ? "Đã cập nhật thông tin nhóm" : "Lưu thông tin nhóm dịch"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-[var(--border-app)]">
          <h2 className="text-lg font-bold mb-4">Thông tin ứng dụng</h2>
          <div className="p-4 bg-[var(--card-app)] rounded-xl border border-[var(--border-app)]">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Tên ứng dụng</span>
              <span className="font-bold text-primary">{APP_CONFIG.appName}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Phiên bản</span>
              <span className="font-mono">2.0.8 Official</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Nhà phát triển gốc</span>
              <span>{APP_CONFIG.author}</span>
            </div>
          </div>
          
          {isAdmin && (
            <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <Zap size={12} />
                Mẹo cho Admin
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Bạn có thể thay đổi tên website, màu sắc chủ đạo và các cài đặt hệ thống khác một cách nhanh chóng trong file <code className="bg-primary/20 px-1 rounded text-primary">src/config.ts</code>.
              </p>
            </div>
          )}

          <div className="mt-10 text-center">
            <p className="text-[10px] text-[var(--text-app)] opacity-40 font-mono uppercase tracking-widest">
              © {APP_CONFIG.appName} - All Rights Reserved - 2026
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
