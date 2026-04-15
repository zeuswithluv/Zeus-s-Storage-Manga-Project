import React, { useState, useEffect } from 'react';
import { Upload as UploadIcon, X, Plus, Image as ImageIcon, Loader2, Link as LinkIcon, Globe, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, fileToBase64 } from '../lib/utils';
import { db, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '../config';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

export const UploadPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const getApiKey = () => {
    return IMGBB_API_KEY || localStorage.getItem('imgbb_api_key');
  };
  const [mangaInfo, setMangaInfo] = useState({
    title: '',
    titleEn: '',
    titleJp: '',
    author: '',
    description: '',
    status: 'Ongoing',
    publisherUrl: '',
    authorUrl: '',
    genres: ''
  });
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [chapterFiles, setChapterFiles] = useState<File[]>([]);

  const uploadToImgBB = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });
      
      const data = await response.json() as any;
      if (data.success) return data.data.url;
      
      // Fallback to client-side if proxy fails (optional, but maybe better to just fail for security)
      throw new Error(data.error || 'Upload to proxy failed');
    } catch (error) {
      console.error('Proxy upload failed, trying direct...', error);
      const apiKey = getApiKey();
      if (!apiKey) throw new Error('API Key missing');

      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json() as any;
      if (data.success) return data.data.url;
      throw new Error('Upload to ImgBB failed');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'background' | 'chapters') => {
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = Array.from(e.target.files);
      if (type === 'cover') setCoverFile(selectedFiles[0]);
      else if (type === 'background') setBackgroundFile(selectedFiles[0]);
      else setChapterFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      setUploadStatus('Vui lòng cấu hình ImgBB API Key trong Cài đặt.');
      setTimeout(() => navigate('/settings'), 2000);
      return;
    }

    setUploading(true);
    setUploadStatus('Đang tải ảnh bìa...');

    try {
      // 1. Upload images to ImgBB
      const coverUrl = await uploadToImgBB(coverFile!);
      
      let backgroundUrl = '';
      if (backgroundFile) {
        setUploadStatus('Đang tải ảnh nền...');
        backgroundUrl = await uploadToImgBB(backgroundFile);
      }

      // 2. Save Manga to Firestore
      setUploadStatus('Đang lưu thông tin truyện...');
      const genresArray = mangaInfo.genres.split(',').map(g => g.trim()).filter(g => g !== '');
      
      const mangaDoc = await addDoc(collection(db, 'mangas'), {
        title: mangaInfo.title,
        titleEn: mangaInfo.titleEn,
        titleJp: mangaInfo.titleJp,
        author: mangaInfo.author,
        description: mangaInfo.description,
        status: mangaInfo.status,
        publisherUrl: mangaInfo.publisherUrl,
        authorUrl: mangaInfo.authorUrl,
        genres: genresArray,
        coverUrl,
        backgroundUrl,
        authorUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        viewCount: 0,
        followerCount: 0,
        rating: 0,
        commentCount: 0
      });

      setUploading(false);
      setSuccessMessage('Tải lên thành công!');
      setTimeout(() => navigate(`/manga/${mangaDoc.id}`), 2000);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.WRITE, 'mangas');
      setUploading(false);
      setUploadStatus('');
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <AlertCircle size={64} className="text-gray-600 mb-6" />
        <h2 className="text-2xl font-bold mb-2">Truy cập bị hạn chế</h2>
        <p className="text-gray-400 mb-8">Chỉ quản trị viên mới có quyền tải truyện lên {APP_CONFIG.appName}.</p>
        <button onClick={() => navigate('/')} className="text-primary font-bold hover:underline">Quay lại trang chủ</button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl font-black mb-2">Tải lên truyện</h1>
        <p className="text-sm sm:text-base text-gray-500">Xây dựng kho lưu trữ {APP_CONFIG.appName} của riêng bạn.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                <Globe size={20} className="text-primary" />
                Thông tin cơ bản
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Tên truyện</label>
                  <input 
                    type="text" required value={mangaInfo.title}
                    onChange={e => setMangaInfo({...mangaInfo, title: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Tên tiếng Việt..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Tên tiếng Anh</label>
                  <input 
                    type="text" value={mangaInfo.titleEn}
                    onChange={e => setMangaInfo({...mangaInfo, titleEn: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="English title..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Tên tiếng Nhật</label>
                  <input 
                    type="text" value={mangaInfo.titleJp}
                    onChange={e => setMangaInfo({...mangaInfo, titleJp: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Japanese title..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Tác giả</label>
                  <input 
                    type="text" value={mangaInfo.author}
                    onChange={e => setMangaInfo({...mangaInfo, author: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Tên tác giả..."
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Trạng thái</label>
                  <select 
                    value={mangaInfo.status}
                    onChange={e => setMangaInfo({...mangaInfo, status: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="Ongoing">Đang tiến hành (Ongoing)</option>
                    <option value="Completed">Đã hoàn thành (Completed)</option>
                    <option value="Hiatus">Tạm ngưng (Hiatus)</option>
                    <option value="Dropped">Bỏ dở (Dropped)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Thể loại (Cách nhau bằng dấu phẩy)</label>
                  <input 
                    type="text" value={mangaInfo.genres}
                    onChange={e => setMangaInfo({...mangaInfo, genres: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Action, Romance, Fantasy..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Mô tả</label>
                <textarea 
                  rows={4} value={mangaInfo.description}
                  onChange={e => setMangaInfo({...mangaInfo, description: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none resize-none"
                  placeholder="Tóm tắt nội dung..."
                />
              </div>
            </div>

            <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                <LinkIcon size={20} className="text-primary" />
                Liên kết chính thức
              </h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Link Nhà xuất bản</label>
                  <input 
                    type="url" value={mangaInfo.publisherUrl}
                    onChange={e => setMangaInfo({...mangaInfo, publisherUrl: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="https://publisher.com/..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Link Tác giả</label>
                  <input 
                    type="url" value={mangaInfo.authorUrl}
                    onChange={e => setMangaInfo({...mangaInfo, authorUrl: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="https://author-page.com/..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Images */}
          <div className="space-y-6">
            {/* Cover Upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Ảnh bìa (Cover)</label>
              <div 
                onClick={() => document.getElementById('cover-upload')?.click()}
                className="aspect-[3/4] bg-gray-800 border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all overflow-hidden relative"
              >
                {coverFile ? (
                  <img src={URL.createObjectURL(coverFile)} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                  <>
                    <ImageIcon className="text-gray-600 mb-2" size={32} />
                    <span className="text-xs text-gray-500">Chọn ảnh bìa</span>
                  </>
                )}
                <input id="cover-upload" type="file" hidden accept="image/*" onChange={e => handleFileChange(e, 'cover')} />
              </div>
            </div>

            {/* Background Upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Ảnh nền (Background)</label>
              <div 
                onClick={() => document.getElementById('bg-upload')?.click()}
                className="aspect-video bg-gray-800 border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all overflow-hidden relative"
              >
                {backgroundFile ? (
                  <img src={URL.createObjectURL(backgroundFile)} className="w-full h-full object-cover" alt="Background" />
                ) : (
                  <>
                    <ImageIcon className="text-gray-600 mb-2" size={32} />
                    <span className="text-xs text-gray-500">Chọn ảnh nền</span>
                  </>
                )}
                <input id="bg-upload" type="file" hidden accept="image/*" onChange={e => handleFileChange(e, 'background')} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={uploading || !coverFile}
            className={cn(
              "px-12 py-4 rounded-2xl font-bold text-white transition-all flex items-center gap-3 shadow-xl",
              uploading || !coverFile ? "bg-gray-700 cursor-not-allowed" : "bg-primary hover:bg-primary-dark shadow-primary/20"
            )}
          >
            {uploading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-sm font-medium">{uploadStatus}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <UploadIcon size={20} />
                <span>Hoàn tất tải lên</span>
              </div>
            )}
          </button>
        </div>
      </form>

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
