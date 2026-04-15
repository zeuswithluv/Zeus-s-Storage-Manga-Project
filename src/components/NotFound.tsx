import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, ShieldAlert } from 'lucide-react';

import { APP_CONFIG } from '../config';

export const NotFound = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md space-y-6"
      >
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={48} className="text-primary" />
        </div>
        <h1 className="text-4xl font-black tracking-tight">404</h1>
        <h2 className="text-xl font-bold text-gray-400">Trang không tồn tại</h2>
        <p className="text-gray-500 leading-relaxed">
          Có vẻ như đường dẫn bạn đang truy cập đã bị hỏng hoặc không còn tồn tại trên hệ thống của {APP_CONFIG.appName}.
        </p>
        <div className="pt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <Home size={20} />
            Quay về trang chủ
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
