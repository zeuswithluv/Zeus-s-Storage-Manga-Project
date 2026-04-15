import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db, collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from '../firebase';
import { MangaCard } from './MangaCard';
import { BookOpen, Trash2, Edit, Plus, LayoutDashboard, Loader2, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const ManageMangasPage = () => {
  const { user } = useAuth();
  const [mangas, setMangas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mangaToDelete, setMangaToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'mangas'), 
      where('authorUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mangaData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMangas(mangaData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching managed mangas:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async () => {
    if (!mangaToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'mangas', mangaToDelete.id));
      setSuccessMessage('Đã xóa truyện thành công.');
      setMangaToDelete(null);
    } catch (error) {
      console.error("Error deleting manga:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Vui lòng đăng nhập để quản lý truyện</h2>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <LayoutDashboard className="text-primary" size={32} />
            Quản lý truyện
          </h1>
          <p className="text-gray-500">Tổng quan và quản lý tất cả các bộ truyện bạn đã đăng.</p>
        </div>
        <Link 
          to="/upload" 
          className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Plus size={20} />
          Đăng truyện mới
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      ) : mangas.length > 0 ? (
        <div className="grid gap-6">
          {mangas.map((manga) => (
            <div 
              key={manga.id}
              className="bg-[var(--card-app)]/30 border border-[var(--border-app)] rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row gap-6 hover:border-primary/30 transition-colors group"
            >
              <div className="w-24 sm:w-32 aspect-[3/4] rounded-xl overflow-hidden shrink-0 shadow-lg">
                <img src={manga.coverUrl} alt={manga.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-xl font-bold group-hover:text-primary transition-colors">{manga.title}</h2>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      manga.status === 'Ongoing' ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-blue-500/10 border-blue-500/30 text-blue-500"
                    )}>
                      {manga.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{manga.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <BookOpen size={14} className="text-primary" />
                      {manga.viewCount || 0} lượt xem
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Plus size={14} className="text-primary" />
                      {manga.followerCount || 0} theo dõi
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Edit size={14} className="text-primary" />
                      Cập nhật: {new Date(manga.updatedAt?.toDate?.() || manga.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6 sm:mt-0">
                  <Link 
                    to={`/manga/${manga.id}`}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-bold text-center transition-colors"
                  >
                    Xem chi tiết
                  </Link>
                  <Link 
                    to="/add-chapter"
                    state={{ mangaId: manga.id }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-bold text-center transition-colors"
                  >
                    Thêm chương
                  </Link>
                  <Link 
                    to={`/edit-manga/${manga.id}`}
                    className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="Chỉnh sửa truyện"
                  >
                    <Edit size={20} />
                  </Link>
                  <button 
                    onClick={() => setMangaToDelete(manga)}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Xóa truyện"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-[var(--card-app)]/30 rounded-3xl border border-dashed border-[var(--border-app)]">
          <BookOpen size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Bạn chưa đăng bộ truyện nào.</p>
          <Link to="/upload" className="inline-block mt-4 text-primary font-bold hover:underline">Đăng truyện ngay</Link>
        </div>
      )}
      {/* Success Message Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-green-500 text-white px-6 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2"
          >
            <ShieldCheck size={20} />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {mangaToDelete && (
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
              <h3 className="text-2xl font-black mb-4">Xác nhận xóa truyện?</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Bộ truyện <span className="text-white font-bold">"{mangaToDelete.title}"</span> sẽ bị xóa vĩnh viễn và không thể hoàn tác.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setMangaToDelete(null)}
                  className="flex-1 py-4 bg-gray-800 rounded-2xl font-bold hover:bg-gray-700 transition-all"
                >
                  Quay lại
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-red-500 rounded-2xl font-bold hover:bg-red-600 transition-all text-white shadow-xl shadow-red-500/20"
                >
                  {isDeleting ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Xóa vĩnh viễn"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
