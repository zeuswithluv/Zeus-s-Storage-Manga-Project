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
  <div className="flex gap-4 group">
    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-800 shrink-0">
      {c.userPhoto ? (
        <img src={c.userPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <UserIcon size={20} className="text-gray-500" />
        </div>
      )}
    </div>
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-3">
        <span className="font-bold text-sm">{c.userName}</span>
        <span className="text-xs text-gray-500">{formatDate(c.createdAt)}</span>
        <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => handleReply(c.userName)}
            className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
            title="Trả lời"
          >
            <Reply size={16} />
          </button>
          {(isAdmin || (user && user.uid === c.uid)) && (
            <button 
              onClick={() => handleDelete(c.id)}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
              title="Xóa"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      <p className="text-gray-400 text-sm">{c.content}</p>
    </div>
  </div>
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
    // If in reader mode, the input is already visible in the form
    // We might need to focus it, but for now just setting the text is good
  };

  const formatDate = (date: any) => {
    if (!date) return 'Vừa xong';
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (typeof date === 'string') return new Date(date).toLocaleDateString();
    return 'N/A';
  };

  if (isReader) {
    return (
      <div className="fixed bottom-6 left-6 z-40">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          <MessageSquare size={24} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-16 left-0 w-80 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[400px]"
            >
              <div className="p-4 border-b border-gray-800 bg-gray-800/50 flex justify-between items-center">
                <h3 className="font-bold text-sm">Bình luận</h3>
                <span className="text-xs text-gray-500">{totalCount}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin text-primary" size={20} />
                  </div>
                ) : comments.length > 0 ? (
                  comments.map(c => (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-primary/30">
                          {c.userPhoto ? (
                            <img src={c.userPhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                              <UserIcon size={10} className="text-primary" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">{c.userName}</span>
                        <span className="text-[10px] text-gray-600">{formatDate(c.createdAt)}</span>
                        <div className="flex gap-1 ml-auto">
                          <button 
                            onClick={() => handleReply(c.userName)}
                            className="p-1 text-gray-600 hover:text-primary transition-colors"
                            title="Trả lời"
                          >
                            <Reply size={10} />
                          </button>
                          {(isAdmin || (user && user.uid === c.uid)) && (
                            <button 
                              onClick={() => setCommentToDelete(c.id)}
                              className="p-1 text-gray-600 hover:text-red-500 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 bg-gray-800 p-2 rounded-lg">{c.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-gray-500 py-4">Chưa có bình luận nào.</p>
                )}

                {totalCount > comments.length && !loading && (
                  <button 
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2 text-[10px] font-bold text-primary hover:bg-primary/5 rounded-lg transition-all disabled:opacity-50"
                  >
                    {loadingMore ? <Loader2 className="animate-spin mx-auto" size={12} /> : `Xem thêm bình luận (${totalCount - comments.length})`}
                  </button>
                )}
              </div>

              {user ? (
                <form onSubmit={handleSubmit} className="p-3 bg-gray-800/50 border-t border-gray-800 flex gap-2">
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Viết bình luận..."
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  <button type="submit" className="p-1.5 bg-primary text-white rounded-lg">
                    <Send size={14} />
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-gray-800/50 border-t border-gray-800 text-center">
                  <p className="text-[10px] text-gray-500">Đăng nhập để bình luận</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <MessageSquare size={20} className="text-primary" />
        Bình luận ({totalCount})
      </h2>
      
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="flex-1">
            <textarea 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Viết bình luận của bạn..."
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary resize-none"
              rows={3}
            />
          </div>
          <button type="submit" className="h-fit px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors">
            Gửi
          </button>
        </form>
      ) : (
        <div className="p-6 bg-gray-800/30 border border-dashed border-gray-700 rounded-xl text-center">
          <p className="text-gray-500">Vui lòng đăng nhập để gửi bình luận.</p>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : comments.length > 0 ? (
          comments.map(c => (
            <CommentItem 
              key={c.id}
              c={c}
              isAdmin={isAdmin}
              user={user}
              formatDate={formatDate}
              handleReply={handleReply}
              handleDelete={(id) => setCommentToDelete(id)}
            />
          ))
        ) : (
          <div className="text-center py-10 opacity-50">
            <p>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
          </div>
        )}

        {totalCount > comments.length && !loading && (
          <div className="flex justify-center pt-4">
            <button 
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-8 py-3 bg-[var(--card-app)] border border-[var(--border-app)] rounded-xl text-sm font-bold text-primary hover:border-primary transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loadingMore && <Loader2 className="animate-spin" size={16} />}
              Xem thêm bình luận ({totalCount - comments.length})
            </button>
          </div>
        )}
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {commentToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-red-500/20 rounded-3xl p-8 w-full max-w-md shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black mb-4">Xác nhận xóa bình luận?</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Bình luận này sẽ bị xóa vĩnh viễn và không thể hoàn tác.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setCommentToDelete(null)}
                  className="flex-1 py-4 bg-gray-800 rounded-2xl font-bold hover:bg-gray-700 transition-all"
                >
                  Quay lại
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-4 bg-red-500 rounded-2xl font-bold hover:bg-red-600 transition-all text-white shadow-xl shadow-red-500/20"
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
