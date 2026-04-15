import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, List, Clock, User, Tag, ChevronRight, Globe, Link as LinkIcon, MessageSquare, Calendar, Loader2, Heart, Edit, Star, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CommentSection } from './Comments';
import { db, doc, getDoc, collection, query, orderBy, onSnapshot, handleFirestoreError, OperationType, Timestamp, where, addDoc, deleteDoc, serverTimestamp, updateDoc, increment } from '../firebase';
import { useAuth } from '../App';

const RATE_LIMIT_MS = 2000; // 2 seconds between actions
let lastActionTime = 0;

export const MangaDetailPage = () => {
  const { mangaId } = useParams();
  const { user, isAdmin } = useAuth();
  const [manga, setManga] = useState<any>(null);
  const isHost = user && manga && user.uid === manga.authorUid;
  const canManage = isAdmin || isHost;
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followDocId, setFollowDocId] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingDocId, setRatingDocId] = useState<string | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'mangas'), (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const genres = doc.data().genres || [];
        genres.forEach((g: string) => {
          counts[g] = (counts[g] || 0) + 1;
        });
      });
      setTagCounts(counts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'mangas');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mangaId) {
      const read = JSON.parse(localStorage.getItem(`read_${mangaId}`) || '[]');
      setReadChapters(read);
    }
  }, [mangaId]);

  useEffect(() => {
    if (!user || !mangaId) {
      setUserRating(null);
      setRatingDocId(null);
      return;
    }

    const q = query(collection(db, 'ratings'), where('uid', '==', user.uid), where('mangaId', '==', mangaId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setUserRating(snapshot.docs[0].data().score);
        setRatingDocId(snapshot.docs[0].id);
      } else {
        setUserRating(null);
        setRatingDocId(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'ratings');
    });

    return () => unsubscribe();
  }, [user, mangaId]);

  const handleRate = async (score: number) => {
    if (!user) {
      setSuccessMessage('Vui lòng đăng nhập để đánh giá truyện.');
      return;
    }

    if (isRating) return;
    setIsRating(true);

    try {
      if (ratingDocId) {
        // Update existing rating
        const oldScore = userRating || 0;
        await updateDoc(doc(db, 'ratings', ratingDocId), {
          score,
          updatedAt: serverTimestamp()
        });

        const newRatingSum = (manga.ratingSum || 0) - oldScore + score;
        const newRatingCount = manga.ratingCount || 1;
        const newAverage = Number((newRatingSum / newRatingCount).toFixed(1));

        await updateDoc(doc(db, 'mangas', mangaId!), {
          ratingSum: newRatingSum,
          rating: newAverage
        });
      } else {
        // Create new rating
        await addDoc(collection(db, 'ratings'), {
          uid: user.uid,
          mangaId: mangaId,
          score,
          createdAt: serverTimestamp()
        });

        const newRatingSum = (manga.ratingSum || 0) + score;
        const newRatingCount = (manga.ratingCount || 0) + 1;
        const newAverage = Number((newRatingSum / newRatingCount).toFixed(1));

        await updateDoc(doc(db, 'mangas', mangaId!), {
          ratingSum: newRatingSum,
          ratingCount: newRatingCount,
          rating: newAverage
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ratings');
      console.error('Error rating manga:', error);
    } finally {
      setIsRating(false);
    }
  };

  useEffect(() => {
    if (!user || !mangaId) {
      setIsFollowing(false);
      setFollowDocId(null);
      return;
    }

    const q = query(collection(db, 'follows'), where('uid', '==', user.uid), where('mangaId', '==', mangaId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setIsFollowing(true);
        setFollowDocId(snapshot.docs[0].id);
      } else {
        setIsFollowing(false);
        setFollowDocId(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'follows');
    });

    return () => unsubscribe();
  }, [user, mangaId]);

  const handleFollow = async () => {
    if (!user) {
      setSuccessMessage('Vui lòng đăng nhập để theo dõi truyện.');
      return;
    }

    const now = Date.now();
    if (now - lastActionTime < RATE_LIMIT_MS) {
      setSuccessMessage('Bạn đang thao tác quá nhanh. Vui lòng đợi một chút.');
      return;
    }
    lastActionTime = now;

    try {
      if (isFollowing && followDocId) {
        await deleteDoc(doc(db, 'follows', followDocId));
        await updateDoc(doc(db, 'mangas', mangaId!), {
          followerCount: increment(-1)
        });
      } else {
        await addDoc(collection(db, 'follows'), {
          uid: user.uid,
          mangaId: mangaId,
          createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'mangas', mangaId!), {
          followerCount: increment(1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'follows');
      console.error('Error following manga:', error);
    }
  };

  useEffect(() => {
    if (!mangaId) return;

    setLoading(true);

    const mangaRef = doc(db, 'mangas', mangaId);
    const unsubscribeManga = onSnapshot(mangaRef, (docSnap) => {
      if (docSnap.exists()) {
        setManga({ id: docSnap.id, ...docSnap.data() });
      } else {
        setManga(null);
      }
      // We don't set loading false here yet, we wait for chapters too
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `mangas/${mangaId}`);
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
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, `mangas/${mangaId}/chapters`);
    });

    return () => {
      unsubscribeManga();
      unsubscribeChapters();
    };
  }, [mangaId]);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (typeof date === 'string') return new Date(date).toLocaleDateString();
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Không tìm thấy truyện</h2>
        <Link to="/" className="text-primary font-bold hover:underline">Quay lại trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Banner Section */}
      <div className="relative">
        {/* Background Banner - Pulled up to go under the header */}
        <div className="h-[40vh] sm:h-[55vh] relative overflow-hidden -mt-16">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)]/20 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent z-10" />
          
          {/* Ripple/Wave Effect Containers - Hidden on mobile for performance */}
          <div className="hidden sm:block absolute inset-0 z-0 opacity-20">
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 3, 0],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] opacity-10 blur-3xl"
            />
          </div>

          <img 
            src={manga.backgroundUrl || manga.coverUrl} 
            alt="Banner" 
            className="w-full h-full object-cover blur-[1px] sm:blur-[2px] opacity-70 scale-105 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="max-w-6xl mx-auto px-6 lg:px-10 -mt-24 lg:-mt-32 relative z-20 flex flex-col lg:flex-row gap-6 lg:gap-10 items-center lg:items-end">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-48 sm:w-56 lg:w-64 aspect-[3/4] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border-4 border-[var(--bg-app)] shrink-0 z-30 relative group"
          >
            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
            <img src={manga.coverUrl} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </motion.div>
          
          <div className="flex-1 pb-2 lg:pb-6 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs sm:text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">{manga.author}</p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-3 tracking-tighter leading-[1.1] drop-shadow-2xl max-w-4xl flex items-center justify-center lg:justify-start gap-4">
                {manga.title}
                {canManage && (
                  <Link 
                    to={`/edit-manga/${mangaId}`} 
                    className="p-2 bg-primary/20 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shrink-0"
                    title="Chỉnh sửa truyện"
                  >
                    <Edit size={20} />
                  </Link>
                )}
              </h1>
              
              <div className="flex items-center justify-center lg:justify-start gap-2 text-gray-400 text-xs sm:text-sm mb-4">
                <Clock size={14} className="text-primary" />
                <span>{formatDate(manga.updatedAt)}</span>
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-8">
                {(manga.genres || []).map((g: string) => (
                  <Link 
                    key={g} 
                    to={`/search?tag=${g}`}
                    className="px-4 py-1.5 bg-[var(--card-app)]/50 text-gray-300 text-[10px] sm:text-xs font-bold rounded-lg border border-[var(--border-app)] hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                  >
                    {g}
                    <span className="text-[9px] opacity-40 font-normal">{tagCounts[g] || 0}</span>
                  </Link>
                ))}
              </div>

              {/* Action Buttons - Integrated into Hero Content for Desktop */}
              <div className="hidden lg:flex items-center gap-4">
                <button 
                  onClick={handleFollow}
                  className={cn(
                    "px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg",
                    isFollowing 
                      ? "bg-red-500 text-white shadow-red-500/20" 
                      : "bg-primary text-white shadow-primary/20 hover:scale-105"
                  )}
                >
                  {isFollowing ? "Bỏ theo dõi" : "Theo dõi truyện"}
                </button>
                
                {chapters.length > 0 ? (
                  <Link 
                    to={`/read/${mangaId}/${chapters[0].id}`}
                    className="px-8 py-4 bg-[var(--card-app)]/80 text-gray-300 rounded-xl font-black text-xs uppercase tracking-widest border border-[var(--border-app)] hover:bg-[var(--card-app)] hover:text-white transition-all"
                  >
                    Đọc từ chương 1
                  </Link>
                ) : (
                  <button 
                    disabled
                    className="px-8 py-4 bg-gray-800 text-gray-500 rounded-xl font-black text-xs uppercase tracking-widest cursor-not-allowed"
                  >
                    Chưa có chương
                  </button>
                )}
              </div>
            </motion.div>
          </div>
          
          {/* Action Buttons - Hidden on Desktop as they are in Hero */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="pb-8 flex flex-col items-center gap-3 lg:hidden w-full"
          >
            {chapters.length > 0 ? (
              <Link 
                to={`/read/${mangaId}/${chapters[0].id}`}
                className="w-full max-w-[280px] px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(26,188,156,0.4)] transition-all hover:scale-105 active:scale-95"
              >
                <Play size={20} fill="currentColor" />
                Đọc ngay
              </Link>
            ) : (
              <button 
                disabled
                className="w-full max-w-[280px] px-8 py-4 bg-gray-700 text-gray-400 rounded-2xl font-bold flex items-center justify-center gap-3 cursor-not-allowed"
              >
                <Play size={24} fill="currentColor" />
                Chưa có chương
              </button>
            )}

            <div className="flex items-center justify-center gap-3 w-full">
              <button 
                onClick={handleFollow}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex items-center justify-center group shrink-0",
                  isFollowing 
                    ? "bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500 hover:text-white" 
                    : "border-gray-700 text-gray-400 hover:border-primary hover:text-primary"
                )}
                title={isFollowing ? "Bỏ theo dõi" : "Theo dõi"}
              >
                <Heart size={24} className={cn(isFollowing && "fill-current")} />
              </button>

              {canManage && (
                <Link 
                  to={`/edit-manga/${mangaId}`}
                  className="flex-1 max-w-[220px] px-6 py-4 rounded-2xl border-2 border-gray-700 text-gray-400 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                  title="Chỉnh sửa truyện"
                >
                  <Edit size={20} />
                  <span className="text-xs font-bold uppercase whitespace-nowrap">Quản lý truyện</span>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6 sm:p-10 pt-12 sm:pt-16 grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
        <div className="lg:col-span-2 space-y-8 sm:space-y-12">
          {/* Mobile/Tablet Stats and Links */}
          <div className="lg:hidden space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--card-app)]/30 border border-[var(--border-app)] rounded-2xl">
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Lượt xem</div>
                <div className="text-sm font-black">{manga.viewCount?.toLocaleString() || 0}</div>
              </div>
              <div className="text-center border-x border-[var(--border-app)]">
                <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Theo dõi</div>
                <div className="text-sm font-black">{manga.followerCount?.toLocaleString() || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Đánh giá</div>
                <div className="text-sm font-black text-primary">
                  {manga.rating || 0} ★ <span className="text-[10px] text-gray-400 font-normal">({manga.ratingCount || 0})</span>
                </div>
              </div>
            </div>

            {/* Links */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <LinkIcon size={20} className="text-primary" />
                Liên kết chính thức
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {manga.publisherUrl && (
                  <a 
                    href={manga.publisherUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-between p-4 bg-[var(--card-app)]/50 border border-[var(--border-app)] rounded-xl hover:border-primary hover:bg-[var(--card-app)] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Globe size={18} />
                      </div>
                      <span className="font-bold text-sm">Nhà xuất bản</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-primary" />
                  </a>
                )}
                {manga.authorUrl && (
                  <a 
                    href={manga.authorUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-between p-4 bg-[var(--card-app)]/50 border border-[var(--border-app)] rounded-xl hover:border-primary hover:bg-[var(--card-app)] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <LinkIcon size={18} />
                      </div>
                      <span className="font-bold text-sm">Trang của tác giả</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-primary" />
                  </a>
                )}
              </div>
            </section>
          </div>

          <section>
            <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
              <List size={20} className="text-primary" />
              Nội dung
            </h2>
            <p className="text-gray-400 leading-relaxed text-sm sm:text-lg">{manga.description}</p>
            
            {/* Management Section for Admins and Hosts */}
            {canManage && (
              <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-3xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl">
                      <ShieldCheck size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-wider text-primary">Khu vực quản lý</h3>
                      <p className="text-[10px] text-gray-500 font-medium">Dành cho {isAdmin ? 'Quản trị viên' : 'Người đăng truyện'}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-lg uppercase tracking-widest">
                    {isAdmin ? 'Admin' : 'Host'}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link 
                    to={`/edit-manga/${mangaId}`}
                    className="flex items-center justify-between p-4 bg-[var(--card-app)] border border-[var(--border-app)] rounded-2xl hover:border-primary transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-all">
                        <Edit size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Sửa thông tin</span>
                        <span className="text-[10px] text-gray-500">Tiêu đề, ảnh, mô tả...</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                  
                  <Link 
                    to={`/edit-manga/${mangaId}`}
                    className="flex items-center justify-between p-4 bg-[var(--card-app)] border border-[var(--border-app)] rounded-2xl hover:border-primary transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-all">
                        <List size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Quản lý chương</span>
                        <span className="text-[10px] text-gray-500">Sửa, xóa, thêm chương...</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                </div>
              </div>
            )}

            {/* Rating Section */}
            <div className="mt-8 p-6 bg-[var(--card-app)]/30 border border-[var(--border-app)] rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg mb-1">Đánh giá của bạn</h3>
                  <p className="text-xs text-gray-500">Hãy cho mọi người biết cảm nhận của bạn về bộ truyện này</p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRate(star)}
                      disabled={isRating}
                      className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
                    >
                      <Star 
                        size={28} 
                        className={cn(
                          "transition-colors",
                          (userRating || 0) >= star ? "text-amber-400 fill-amber-400" : "text-gray-600"
                        )} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <List size={20} className="text-primary" />
                Danh sách chương
              </h2>
              <span className="text-sm text-gray-500">{chapters.length} chương</span>
            </div>
            
            <div className="grid gap-3">
              {chapters.map((ch) => {
                const isRead = readChapters.includes(ch.id);
                return (
                  <Link 
                    key={ch.id}
                    to={`/read/${mangaId}/${ch.id}`}
                    className={cn(
                      "group flex items-center justify-between p-4 bg-[var(--card-app)]/50 hover:bg-[var(--card-app)] border border-[var(--border-app)] hover:border-primary/50 rounded-xl transition-all",
                      isRead && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-colors",
                        isRead 
                          ? "bg-gray-800 text-gray-500" 
                          : "bg-[var(--bg-app)] text-primary group-hover:bg-primary group-hover:text-white"
                      )}>
                        {ch.number}
                      </span>
                      <div>
                        <h3 className={cn(
                          "font-medium transition-colors",
                          isRead ? "text-gray-500" : "group-hover:text-primary"
                        )}>
                          {ch.title}
                          {isRead && <span className="ml-2 text-[10px] uppercase font-bold text-gray-600">(Đã đọc)</span>}
                        </h3>
                        <p className="text-xs text-gray-500">{formatDate(ch.createdAt)}</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className={cn(
                      "transition-colors",
                      isRead ? "text-gray-800" : "text-gray-600 group-hover:text-primary"
                    )} />
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="pt-8 border-t border-[var(--border-app)]">
            <CommentSection mangaId={mangaId || ''} />
          </section>
        </div>
        
        <div className="space-y-8">
          <div className="p-6 bg-[var(--card-app)]/30 border border-[var(--border-app)] rounded-2xl hidden lg:block">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-widest text-gray-400">Liên kết</h3>
            <div className="space-y-3">
              {manga.publisherUrl && (
                <a href={manga.publisherUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-[var(--bg-app)]/50 rounded-xl hover:bg-primary/10 hover:text-primary transition-all group">
                  <div className="flex items-center gap-3">
                    <Globe size={16} className="text-gray-500 group-hover:text-primary" />
                    <span className="text-sm font-medium">Nhà xuất bản</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-600 group-hover:text-primary" />
                </a>
              )}
              {manga.authorUrl && (
                <a href={manga.authorUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-[var(--bg-app)]/50 rounded-xl hover:bg-primary/10 hover:text-primary transition-all group">
                  <div className="flex items-center gap-3">
                    <LinkIcon size={16} className="text-gray-500 group-hover:text-primary" />
                    <span className="text-sm font-medium">Trang của tác giả</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-600 group-hover:text-primary" />
                </a>
              )}
            </div>
          </div>

          <div className="p-6 bg-[var(--card-app)]/30 border border-[var(--border-app)] rounded-2xl hidden lg:block">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-widest text-gray-400">Thông tin khác</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Lượt xem</span>
                <span className="font-medium">{manga.viewCount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Người theo dõi</span>
                <span className="font-medium">{manga.followerCount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Đánh giá</span>
                <div className="text-right">
                  <span className="font-medium text-primary">{manga.rating || 0} ★</span>
                  <div className="text-[10px] text-gray-400">{manga.ratingCount || 0} lượt đánh giá</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
    </div>
  );
};
