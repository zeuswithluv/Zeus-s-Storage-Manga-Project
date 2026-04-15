import React, { useState, useEffect } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { db, collection, query, where, onSnapshot, getDoc, doc, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import { MangaCard } from './MangaCard';

export const LibraryPage = () => {
  const { user } = useAuth();
  const [mangas, setMangas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'follows'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const followData = snapshot.docs.map(d => d.data());
      
      if (followData.length === 0) {
        setMangas([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch manga details for each followed manga
        const mangaPromises = followData.map(f => getDoc(doc(db, 'mangas', f.mangaId)));
        const mangaDocs = await Promise.all(mangaPromises);
        
        const followedMangas = mangaDocs
          .filter(d => d.exists())
          .map(d => ({ id: d.id, ...d.data() }));

        setMangas(followedMangas);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'follows/mangas');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'follows');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <BookOpen size={64} className="text-gray-600 mb-6" />
        <h2 className="text-2xl font-bold mb-2">Bạn cần đăng nhập</h2>
        <p className="text-gray-400 mb-8">Vui lòng đăng nhập để xem thư viện của bạn.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 relative overflow-hidden min-h-screen">
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Thư viện của bạn</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            {mangas.length} bộ truyện đã lưu
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary" size={32} />
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
                delay={i * 0.05}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[var(--card-app)]/30 rounded-3xl border border-dashed border-[var(--border-app)]">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">Bạn chưa theo dõi bộ truyện nào.</p>
            <Link to="/" className="inline-block mt-4 text-primary font-bold hover:underline">Khám phá ngay</Link>
          </div>
        )}
      </div>
    </div>
  );
};
