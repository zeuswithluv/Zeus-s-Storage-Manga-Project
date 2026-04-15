import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface MangaCardProps {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  rating?: number;
  viewCount?: number;
  updatedAt?: any;
  delay?: number;
  key?: React.Key;
}

export const MangaCard = React.memo(({ id, title, author, coverUrl, rating, viewCount, updatedAt, delay = 0 }: MangaCardProps) => {
  const isNew = updatedAt && (Date.now() - (updatedAt.seconds * 1000) < 48 * 60 * 60 * 1000);

  return (
    <Link 
      to={`/manga/${id}`}
      className="manga-card-hover group cursor-pointer block"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "50px" }}
        transition={{ duration: 0.3, delay: Math.min(delay, 0.3) }}
      >
        <div className="aspect-[3/4] rounded-xl bg-[var(--card-app)] overflow-hidden relative mb-3 shadow-lg border border-[var(--border-app)] group-hover:border-primary/50 transition-colors">
          <img 
            src={coverUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <div className="bg-primary text-white p-3 rounded-2xl shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
              <BookOpen size={20} />
            </div>
          </div>
          {(rating !== undefined || viewCount !== undefined || isNew) && (
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {isNew && (
                <div className="bg-primary px-2 py-0.5 rounded-lg text-[10px] font-black text-white uppercase tracking-wider shadow-lg shadow-primary/30">
                  Mới
                </div>
              )}
              {rating !== undefined && rating > 0 && (
                <div className="bg-black/60 sm:backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-yellow-400 flex items-center gap-1">
                  <Star size={10} fill="currentColor" />
                  {rating.toFixed(1)}
                </div>
              )}
            </div>
          )}
        </div>
        <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-xs text-gray-400 font-medium">{author}</p>
      </motion.div>
    </Link>
  );
});
