import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User as UserIcon, Loader2, Trash2, Reply, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, handleFirestoreError, OperationType, Timestamp, deleteDoc, doc, limit, getCountFromServer, startAfter, getDocs } from '../firebase';
import { useAuth } from '../App';

const RATE_LIMIT_MS = 3000; // 3 seconds between comments
const PAGE_SIZE = 10;
let lastCommentTime = 0;

interface Comment {
  id: string;
  userName: string;
  userPhoto?: string;
  content: string;
  createdAt: any;
  uid: string;
}

const CommentItem = React.memo(({ c, isAdmin, user, formatDate, handleReply, handleDelete }: { 
  c: Comment, 
  isAdmin: boolean, 
  user: any, 
  formatDate: (d: any) => string,
  handleReply: (n: string) => void,
  handleDelete: (id: string) => void
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex gap-4 group hover:bg-white/[0.02] p-2 -mx-2 rounded-2xl transition-all"
  >
    <div className="w-11 h-11 rounded-2xl overflow-hidden border border-white/5 ring-1 ring-white/5 shrink-0 bg-gray-800 flex items-center justify-center shadow-lg">
      {c.userPhoto ? (
        <img src={c.userPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
      ) : (
        <UserIcon size={22} className="text-gray-500" />
      )}
    </div>
    <div className="flex-1 space-y-1.5 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-black text-sm text-[var(--text-app)] truncate">{c.userName}</span>
        <div className="w-1 h-1 rounded-full bg-gray-700" />
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{formatDate(c.createdAt)}</span>
        
        <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={() => handleReply(c.userName)}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
            title="Trả lời"
          >
            <Reply size={14} />
          </button>
          {(isAdmin || (user && user.uid === c.uid)) && (
            <button 
              onClick={() => handleDelete(c.id)}
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              title="Xóa"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="bg-[var(--card-app)]/50 backdrop-blur-sm border border-white/[0.05] p-3 rounded-2xl rounded-tl-none">
        <p className="text-gray-300 text-[13px] leading-relaxed break-words">{c.content}</p>
      </div>
    </div>
  </motion.div>
));

export const CommentSection = ({ mangaId, isReader = false }: { mangaId: string, isReader?: boolean }) => {
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchTotal = async () => {
    if (!mangaId) return;
    try {
      const snapshot = await getCountFromServer(collection(db, 'mangas', mangaId, 'comments'));
      setTotalCount(snapshot.data().count);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `mangas/${mangaId}/comments`);
      console.error("Error fetching count:", error);
    }
  };

  useEffect(() => {
    fetchTotal();
  }, [mangaId]);
  
  useEffect(() => {
    if (!mangaId) return;
    
    setLoading(true);
    // Initial load: Use onSnapshot for real-time updates on the first page
    const q = query(
      collection(db, 'mangas', mangaId, 'comments'), 
      orderBy('createdAt', 'desc'), 
      limit(PAGE_SIZE)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      
      setComments(commentData);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `mangas/${mangaId}/comments`);
      console.error("Comments error:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [mangaId]);

  const handleLoadMore = async () => {
    if (!mangaId || !lastDoc || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'mangas', mangaId, 'comments'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const newComments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Comment[];
        
        setComments(prev => [...prev, ...newComments]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `mangas/${mangaId}/comments`);
      console.error("Error loading more comments:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const now = Date.now();
    if (now - lastCommentTime < RATE_LIMIT_MS) {
      setSuccessMessage('Bạn đang gửi bình luận quá nhanh. Vui lòng đợi một chút.');
      return;
    }
    lastCommentTime = now;
    
    const content = newComment.trim();
    setNewComment('');

    try {
      await addDoc(collection(db, 'mangas', mangaId, 'comments'), {
        mangaId,
        uid: user.uid,
        userName: user.displayName || 'Người dùng',
        userPhoto: user.photoURL || '',
        content,
        createdAt: serverTimestamp()
      });
      // Refresh count
      const snapshot = await getCountFromServer(collection(db, 'mangas', mangaId, 'comments'));
      setTotalCount(snapshot.data().count);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `mangas/${mangaId}/comments`);
    }
  };

  const handleDelete = async () => {
    if (!commentToDelete || !mangaId) return;
    try {
      await deleteDoc(doc(db, 'mangas', mangaId, 'comments', commentToDelete));
      setCommentToDelete(null);
      setSuccessMessage('Đã xóa bình luận.');
      // Refresh count
      const snapshot = await getCountFromServer(collection(db, 'mangas', mangaId, 'comments'));
      setTotalCount(snapshot.data().count);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `mangas/${mangaId}/comments/${commentToDelete}`);
    }
  };

  const handleReply = (userName: string) => {
    setNewComment(`@${userName} `);
  };

  const formatDate = (date: any) => {
    if (!date) return 'Vừa xong';
    if (date instanceof Timestamp) {
      const now = new Date();
      const diff = now.getTime() - date.toDate().getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Vừa xong';
      if (minutes < 60) return `${minutes} phút trước`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} giờ trước`;
      return date.toDate().toLocaleDateString('vi-VN');
    }
    return 'N/A';
  };

  if (isReader) {
    return (
      <div className="fixed bottom-6 left-6 z-[70]">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300",
            isOpen ? "bg-primary text-white rotate-90 rounded-full" : "bg-[var(--sidebar-app)] text-primary border border-white/10"
          )}
        >
          {isOpen ? <Reply size={24} className="rotate-180" /> : <MessageSquare size={24} />}
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
              className="absolute bottom-20 left-0 w-[350px] bg-[var(--sidebar-app)]/90 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[500px]"
            >
              <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-xl">
                    <MessageSquare size={18} className="text-primary" />
                  </div>
                  <h3 className="font-black text-sm tracking-tight">Bình luận</h3>
                </div>
                <span className="px-2.5 py-1 bg-white/5 rounded-full text-[10px] font-black text-gray-400">{totalCount}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : comments.length > 0 ? (
                  comments.map(c => (
                    <div key={c.id} className="space-y-2 group">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 ring-1 ring-white/10 bg-gray-800 shrink-0">
                          {c.userPhoto ? (
                            <img src={c.userPhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <UserIcon size={14} className="text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-black text-gray-300 truncate">{c.userName}</span>
                          <span className="text-[9px] text-gray-600 font-bold uppercase">{formatDate(c.createdAt)}</span>
                        </div>
                        <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleReply(c.userName)}
                            className="p-1.5 text-gray-600 hover:text-primary transition-colors"
                          >
                            <Reply size={12} />
                          </button>
                          {(isAdmin || (user && user.uid === c.uid)) && (
                            <button 
                              onClick={() => setCommentToDelete(c.id)}
                              className="p-1.5 text-gray-600 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="bg-white/5 border border-white/[0.03] p-3 rounded-2xl rounded-tl-none">
                        <p className="text-[12px] text-gray-300 leading-relaxed font-medium">{c.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 opacity-30">
                    <MessageSquare size={40} className="mx-auto mb-4" />
                    <p className="text-[11px] font-bold uppercase tracking-widest italic">Chưa có bình luận</p>
                  </div>
                )}

                {totalCount > comments.length && !loading && (
                  <button 
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-3 mt-4 text-[11px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-2xl transition-all disabled:opacity-50"
                  >
                    {loadingMore ? "Đang tải..." : `Xem thêm (${totalCount - comments.length})`}
                  </button>
                )}
              </div>

              <div className="p-4 bg-black/40 border-t border-white/5 shrink-0">
                {user ? (
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Lời nhắn từ tâm..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-[18px] px-4 py-2.5 text-[13px] outline-none focus:border-primary/50 transition-all font-medium"
                    />
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      type="submit" 
                      className="w-10 h-10 bg-primary text-white rounded-[18px] shadow-lg shadow-primary/20 flex items-center justify-center shrink-0"
                    >
                      <Send size={18} />
                    </motion.button>
                  </form>
                ) : (
                  <div className="py-2 text-center">
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">Vui lòng đăng nhập để bình luận</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <MessageSquare size={24} className="text-primary" />
          </div>
          Bình luận ({totalCount})
        </h2>
      </div>
      
      {user ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
            <textarea 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Chia sẻ cảm nhận của bạn về bộ truyện này..."
              className="relative w-full bg-[var(--card-app)]/50 backdrop-blur-sm border border-[var(--border-app)] rounded-3xl px-6 py-5 text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm min-h-[120px] font-medium"
            />
          </div>
          <div className="flex justify-end">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-sm hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 flex items-center gap-3"
            >
              <Send size={18} />
              Gửi bình luận
            </motion.button>
          </div>
        </form>
      ) : (
        <div className="p-10 bg-[var(--card-app)]/30 border-2 border-dashed border-[var(--border-app)] rounded-[40px] text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center text-gray-600">
            <UserIcon size={32} />
          </div>
          <p className="text-gray-500 font-bold tracking-tight">Cần đăng nhập để tham gia thảo luận.</p>
        </div>
      )}

      <div className="space-y-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {comments.map(c => (
              <CommentItem 
                key={c.id}
                c={c}
                isAdmin={isAdmin}
                user={user}
                formatDate={formatDate}
                handleReply={handleReply}
                handleDelete={(id) => setCommentToDelete(id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[var(--card-app)]/20 rounded-[40px] border border-dashed border-[var(--border-app)]">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-800 opacity-20" />
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] italic text-sm">Vườn không nhà trống</p>
          </div>
        )}

        {totalCount > comments.length && !loading && (
          <div className="flex justify-center pt-8">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-12 py-4 bg-[var(--card-app)] border border-[var(--border-app)] rounded-2xl text-sm font-black text-primary hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 flex items-center gap-3 shadow-sm hover:shadow-primary/10"
            >
              {loadingMore ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={18} />}
              Xem thêm {totalCount - comments.length} bình luận khác
            </motion.button>
          </div>
        )}
      </div>

      {/* Success Message Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 size={24} />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {commentToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
              className="bg-[var(--sidebar-app)] border border-red-500/20 rounded-[40px] p-10 w-full max-w-md shadow-2xl text-center"
            >
              <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-red-500/5">
                <Trash2 size={48} className="text-red-500" />
              </div>
              <h3 className="text-3xl font-black mb-4 tracking-tight">Xóa bình luận?</h3>
              <p className="text-gray-500 mb-10 leading-relaxed font-medium uppercase text-[11px] tracking-widest">
                Hành động này không thể hoàn tác và dữ liệu sẽ biến mất vĩnh viễn.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setCommentToDelete(null)}
                  className="flex-1 py-5 bg-white/5 rounded-[24px] font-black text-sm hover:bg-white/10 transition-all border border-white/5"
                >
                  Quay lại
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-5 bg-red-500 rounded-[24px] font-black text-sm hover:bg-red-600 transition-all text-white shadow-xl shadow-red-500/30"
                >
                  Xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
