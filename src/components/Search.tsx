import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Loader2, BookOpen, X, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, onSnapshot, orderBy, handleFirestoreError, OperationType } from '../firebase';
import { MangaCard } from './MangaCard';
import { cn } from '../lib/utils';
import { useSearchParams } from 'react-router-dom';
import { APP_CONFIG } from '../config';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [mangas, setMangas] = useState<any[]>([]);
  const [filteredMangas, setFilteredMangas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const allTags = Array.from(new Set(mangas.flatMap(m => m.genres || []))).sort() as string[];
  const tagCounts = mangas.reduce((acc, m) => {
    (m.genres || []).forEach((g: string) => {
      acc[g] = (acc[g] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    const q = query(collection(db, 'mangas'), orderBy('title', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mangaData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMangas(mangaData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'mangas');
      console.error("Search fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim() && !selectedTag) {
      setFilteredMangas([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = mangas.filter(manga => {
      const matchesSearch = !term || 
        manga.title.toLowerCase().includes(term) || 
        (manga.titleEn && manga.titleEn.toLowerCase().includes(term)) ||
        (manga.titleJp && manga.titleJp.toLowerCase().includes(term)) ||
        (manga.author && manga.author.toLowerCase().includes(term));
      
      const matchesTag = !selectedTag || 
        (Array.isArray(manga.genres) && manga.genres.includes(selectedTag));
      
      return matchesSearch && matchesTag;
    });
    setFilteredMangas(filtered);
  }, [searchTerm, selectedTag, mangas]);

  const handleTagClick = (tag: string) => {
    const newTag = selectedTag === tag ? '' : tag;
    setSelectedTag(newTag);
    setSearchParams(prev => {
      if (newTag) prev.set('tag', newTag);
      else prev.delete('tag');
      return prev;
    });
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto min-h-screen">
      <div className="mb-10">
        <h1 className="text-3xl font-black mb-2">Tìm kiếm</h1>
        <p className="text-gray-500">Tìm kiếm bộ truyện yêu thích của bạn trong {APP_CONFIG.appName}.</p>
      </div>

      <div className="relative mb-12">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <SearchIcon className="text-gray-500" size={20} />
        </div>
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSearchParams(prev => {
              if (e.target.value) prev.set('q', e.target.value);
              else prev.delete('q');
              return prev;
            });
          }}
          placeholder="Nhập tên truyện, tác giả hoặc thể loại..."
          className="w-full bg-[var(--card-app)]/50 border border-[var(--border-app)] rounded-2xl pl-12 pr-12 py-4 focus:ring-2 focus:ring-primary outline-none transition-all text-lg"
          autoFocus
        />
        {searchTerm && (
          <button 
            onClick={() => {
              setSearchTerm('');
              setSearchParams(prev => {
                prev.delete('q');
                return prev;
              });
            }}
            className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-primary transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Tag Cloud */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4 text-gray-400">
          <Tag size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Lọc theo thể loại</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2",
                selectedTag === tag 
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-[var(--card-app)]/50 border-[var(--border-app)] text-gray-400 hover:border-primary/50 hover:text-primary"
              )}
            >
              {tag}
              <span className={cn(
                "text-[10px] font-normal opacity-50",
                selectedTag === tag ? "text-white" : "text-gray-500"
              )}>
                {tagCounts[tag] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary mb-4" size={48} />
          <p className="text-gray-500">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(searchTerm.trim() === '' && !selectedTag) ? (
            <div className="text-center py-20 opacity-50">
              <SearchIcon size={64} className="mx-auto mb-4 text-gray-700" />
              <p className="text-xl font-medium">Bắt đầu tìm kiếm ngay</p>
              <p className="text-sm">Nhập từ khóa hoặc chọn thể loại để tìm thấy bộ truyện bạn muốn</p>
            </div>
          ) : filteredMangas.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Kết quả tìm kiếm ({filteredMangas.length})</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8">
                {filteredMangas.map((manga, i) => (
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
            </>
          ) : (
            <div className="text-center py-20 bg-[var(--card-app)]/30 rounded-3xl border border-dashed border-[var(--border-app)]">
              <BookOpen size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">Không tìm thấy kết quả nào cho "{searchTerm}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
