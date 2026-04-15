import React, { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, Loader2, Upload as UploadIcon, X, FileText, FolderOpen, AlertCircle, Layers, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, fileToBase64 } from '../lib/utils';
import { db, collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '../config';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

export const AddChapterPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedManga, setSelectedManga] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [chapterInfo, setChapterInfo] = useState({
    number: '',
    title: ''
  });
  const [files, setFiles] = useState<File[]>([]);
  const [bulkChapters, setBulkChapters] = useState<any[]>([]);
  const [existingChapters, setExistingChapters] = useState<number[]>([]);
  const [maxSortOrder, setMaxSortOrder] = useState(-1);
  const [successMessage, setSuccessMessage] = useState('');

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const getApiKey = () => {
    return IMGBB_API_KEY || localStorage.getItem('imgbb_api_key');
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        try {
          // Simple search: filter by title starting with query (case sensitive in Firestore, so we might need a better approach or just fetch all and filter client side if small)
          // For now, let's fetch all and filter client side to be more user friendly with case-insensitivity
          const q = query(collection(db, 'mangas'));
          const querySnapshot = await getDocs(q);
          const results = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((m: any) => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
          setSearchResults(results);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'mangas');
          console.error("Search error:", error);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const fetchExistingChapters = async () => {
      if (!selectedManga) {
        setExistingChapters([]);
        setMaxSortOrder(-1);
        return;
      }
      try {
        const q = query(collection(db, 'mangas', selectedManga.id, 'chapters'));
        const snap = await getDocs(q);
        const numbers = snap.docs.map(d => d.data().number);
        const sortOrders = snap.docs.map(d => d.data().sortOrder || 0);
        setExistingChapters(numbers);
        setMaxSortOrder(sortOrders.length > 0 ? Math.max(...sortOrders) : -1);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `mangas/${selectedManga.id}/chapters`);
        console.error("Error fetching existing chapters:", error);
      }
    };
    fetchExistingChapters();
  }, [selectedManga]);

  const uploadToImgBB = async (file: File, retryCount = 0): Promise<string> => {
    try {
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });
      
      const data = await response.json() as any;
      
      if (data.success) {
        return data.data.url;
      } else {
        const errorMsg = data.error?.message || data.error || 'Unknown error';
        
        // Handle Rate Limit Reached
        if (errorMsg.includes('Rate limit reached') && retryCount < 3) {
          const waitTime = (retryCount + 1) * 3000;
          setUploadStatus(`Bị giới hạn tốc độ. Đang thử lại sau ${waitTime/1000}s... (Lần ${retryCount + 1})`);
          await delay(waitTime);
          return uploadToImgBB(file, retryCount + 1);
        }
        
        throw new Error(`Proxy Error: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Proxy upload failed, trying direct...', error);
      const apiKey = getApiKey();
      if (!apiKey) throw new Error('API Key missing. Vui lòng kiểm tra Cài đặt.');

      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json() as any;
        
        if (data.success) {
          return data.data.url;
        } else {
          const errorMsg = data.error?.message || 'Unknown ImgBB error';
          if (errorMsg.includes('Rate limit reached') && retryCount < 3) {
            const waitTime = (retryCount + 1) * 3000;
            setUploadStatus(`Bị giới hạn tốc độ. Đang thử lại sau ${waitTime/1000}s... (Lần ${retryCount + 1})`);
            await delay(waitTime);
            return uploadToImgBB(file, retryCount + 1);
          }
          throw new Error(`ImgBB Error: ${errorMsg}`);
        }
      } catch (err: any) {
        if (retryCount < 3) {
          await delay(2000);
          return uploadToImgBB(file, retryCount + 1);
        }
        throw new Error(`Lỗi kết nối ImgBB: ${err.message}`);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).sort((a: File, b: File) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const allFiles = Array.from(e.target.files) as File[];
      const imageFiles = allFiles.filter((f: File) => {
        const isImage = f.type.startsWith('image/');
        const isImageExt = /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name);
        return isImage || isImageExt;
      }).sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath, undefined, { numeric: true }));
      
      if (isBulkMode) {
        // Group by folder and preserve order
        const folderOrder: string[] = [];
        const groups: { [key: string]: File[] } = {};
        imageFiles.forEach(file => {
          const path = (file as any).webkitRelativePath || '';
          const parts = path.split('/');
          if (parts.length > 1) {
            const folderName = parts[parts.length - 2]; // Get the immediate parent folder
            if (!groups[folderName]) {
              groups[folderName] = [];
              folderOrder.push(folderName);
            }
            groups[folderName].push(file);
          }
        });

        let lastNum = 0;
        const chapters = folderOrder.map(name => {
          // Try to extract number from name
          const numMatch = name.match(/(\d+(\.\d+)?)/);
          let number: string;
          if (numMatch) {
            number = numMatch[1];
            lastNum = parseFloat(number);
          } else {
            // It's an extra or something without a number, assign a decimal number based on sequence
            lastNum += 0.1;
            number = lastNum.toFixed(1);
          }

          const title = name.replace(/^(Chương|Chapter)\s*\d+[:\s-]*/i, '').trim();
          
          return {
            name,
            number,
            title,
            files: groups[name].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
            status: 'pending' as 'pending' | 'uploading' | 'success' | 'error'
          };
        });

        setBulkChapters(chapters);
      } else {
        const newFiles = imageFiles.sort((a: File, b: File) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        setFiles(newFiles);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedManga) return;
    
    const apiKey = getApiKey();
    if (!apiKey) {
      setUploadStatus('Vui lòng cấu hình ImgBB API Key trong Cài đặt.');
      setTimeout(() => navigate('/settings'), 1500);
      return;
    }

    if (isBulkMode) {
      if (bulkChapters.length === 0) return;
      setUploading(true);

      try {
        for (let i = 0; i < bulkChapters.length; i++) {
          const chapter = bulkChapters[i];
          if (chapter.status === 'success' || chapter.status === 'exists') continue;

          const currentNumber = parseFloat(chapter.number);
          
          // Check if chapter already exists
          if (existingChapters.includes(currentNumber)) {
            setBulkChapters(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'exists' } : c));
            continue;
          }

          setBulkChapters(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'uploading' } : c));
          setUploadStatus(`Đang tải chương ${chapter.number || chapter.name}...`);

          const pageUrls = [];
          for (let j = 0; j < chapter.files.length; j++) {
            const file = chapter.files[j];
            setUploadStatus(`Đang tải chương ${chapter.number}: Trang ${j + 1}/${chapter.files.length}...`);
            const url = await uploadToImgBB(file);
            pageUrls.push(url);
            // Small delay between pages to be gentle on the API
            await delay(300);
          }

          const finalNumber = chapter.number;
          let cleaned = (chapter.title || "").trim();
          
          // Aggressive regex to remove redundant prefixes
          const prefixRegex = new RegExp(`^(Chương|Chapter|Chap|Ch|Vol|Volume|Tập)\\s*${finalNumber}(\\.0)?\\s*[:\\s-：]*`, 'i');
          
          let changed = true;
          while (changed) {
            const before = cleaned;
            cleaned = cleaned.replace(prefixRegex, '').trim();
            cleaned = cleaned.replace(/^[:\\s-：]+/, '').trim();
            changed = cleaned !== before;
          }
          
          const finalTitle = cleaned ? `Chương ${finalNumber}: ${cleaned}` : `Chương ${finalNumber}: không có tiêu đề`;

          await addDoc(collection(db, 'mangas', selectedManga.id, 'chapters'), {
            mangaId: selectedManga.id,
            number: currentNumber,
            sortOrder: maxSortOrder + 1 + i,
            title: finalTitle,
            pages: pageUrls,
            createdAt: serverTimestamp()
          });

          setBulkChapters(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'success' } : c));
        }

        await updateDoc(doc(db, 'mangas', selectedManga.id), {
          updatedAt: serverTimestamp()
        });

        setUploading(false);
        setSuccessMessage('Đã tải lên tất cả các chương thành công!');
        setTimeout(() => navigate(`/manga/${selectedManga.id}`), 1500);
      } catch (error: any) {
        handleFirestoreError(error, OperationType.WRITE, `mangas/${selectedManga.id}/chapters`);
        console.error(error);
        setUploading(false);
        setUploadStatus(`Lỗi khi tải lên hàng loạt: ${error.message}`);
      }
    } else {
      if (!chapterInfo.number || files.length === 0) return;
      setUploading(true);

      try {
        setUploadStatus('Đang tải các trang truyện...');
        const pageUrls = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadStatus(`Đang tải trang ${i + 1}/${files.length}...`);
          const url = await uploadToImgBB(file);
          pageUrls.push(url);
          await delay(300);
        }

        const finalNumber = chapterInfo.number;
        let cleaned = (chapterInfo.title || "").trim();
        
        // Aggressive regex to remove redundant prefixes
        const prefixRegex = new RegExp(`^(Chương|Chapter|Chap|Ch|Vol|Volume|Tập)\\s*${finalNumber}(\\.0)?\\s*[:\\s-：]*`, 'i');
        
        let changed = true;
        while (changed) {
          const before = cleaned;
          cleaned = cleaned.replace(prefixRegex, '').trim();
          cleaned = cleaned.replace(/^[:\\s-：]+/, '').trim();
          changed = cleaned !== before;
        }
        
        const finalTitle = cleaned ? `Chương ${finalNumber}: ${cleaned}` : `Chương ${finalNumber}: không có tiêu đề`;

        await addDoc(collection(db, 'mangas', selectedManga.id, 'chapters'), {
          mangaId: selectedManga.id,
          number: parseFloat(finalNumber),
          sortOrder: maxSortOrder + 1,
          title: finalTitle,
          pages: pageUrls,
          createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, 'mangas', selectedManga.id), {
          updatedAt: serverTimestamp()
        });

        setUploading(false);
        setSuccessMessage(`Đã thêm chương ${chapterInfo.number} thành công!`);
        setTimeout(() => navigate(`/manga/${selectedManga.id}`), 1500);
      } catch (error: any) {
        console.error(error);
        setUploading(false);
        
        if (error.message.includes('ImgBB Error') || error.message.includes('Lỗi kết nối ImgBB') || error.message.includes('API Key missing')) {
          setUploadStatus(error.message);
        } else {
          handleFirestoreError(error, OperationType.WRITE, `mangas/${selectedManga.id}/chapters`);
        }
      }
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <AlertCircle size={64} className="text-gray-600 mb-6" />
        <h2 className="text-2xl font-bold mb-2">Truy cập bị hạn chế</h2>
        <p className="text-gray-400 mb-8">Chỉ quản trị viên mới có quyền thêm chương mới vào {APP_CONFIG.appName}.</p>
        <button onClick={() => navigate('/')} className="text-primary font-bold hover:underline">Quay lại trang chủ</button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2">Thêm chương mới</h1>
          <p className="text-sm sm:text-base text-gray-500">Cập nhật chương mới cho các bộ truyện hiện có.</p>
        </div>
        
        <div className="flex bg-[var(--card-app)] p-1 rounded-xl border border-[var(--border-app)]">
          <button 
            onClick={() => { setIsBulkMode(false); setFiles([]); setBulkChapters([]); }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              !isBulkMode ? "bg-primary text-white shadow-lg" : "text-gray-500 hover:text-[var(--text-app)]"
            )}
          >
            Đơn lẻ
          </button>
          <button 
            onClick={() => { setIsBulkMode(true); setFiles([]); setBulkChapters([]); }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              isBulkMode ? "bg-primary text-white shadow-lg" : "text-gray-500 hover:text-[var(--text-app)]"
            )}
          >
            Hàng loạt
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Step 1: Select Manga */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">1</span>
            Chọn truyện
          </h2>
          
          {!selectedManga ? (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                {searching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
              </div>
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm tên truyện để thêm chương..."
                className="w-full bg-[var(--card-app)] border border-[var(--border-app)] rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary outline-none transition-all"
              />
              
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[var(--card-app)] border border-[var(--border-app)] rounded-2xl shadow-2xl z-30 overflow-hidden max-h-64 overflow-y-auto"
                  >
                    {searchResults.map(manga => (
                      <button
                        key={manga.id}
                        onClick={() => setSelectedManga(manga)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-primary/10 transition-colors border-b border-[var(--border-app)] last:border-0 text-left"
                      >
                        <img src={manga.coverUrl} alt="" className="w-12 h-16 object-cover rounded-md" referrerPolicy="no-referrer" />
                        <div>
                          <div className="font-bold">{manga.title}</div>
                          <div className="text-xs text-gray-500">{manga.author}</div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/30 rounded-2xl">
              <div className="flex items-center gap-4">
                <img src={selectedManga.coverUrl} alt="" className="w-12 h-16 object-cover rounded-md" referrerPolicy="no-referrer" />
                <div>
                  <div className="font-bold text-primary">{selectedManga.title}</div>
                  <div className="text-xs text-primary/70">{selectedManga.author}</div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedManga(null)}
                className="p-2 hover:bg-primary/20 rounded-full text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </section>

        {/* Step 2: Chapter Details */}
        <AnimatePresence>
          {selectedManga && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              className="space-y-8 overflow-hidden"
            >
              {!isBulkMode && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">2</span>
                    Thông tin chương
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Số chương</label>
                      <input 
                        type="number" required={!isBulkMode} step="0.1"
                        value={chapterInfo.number}
                        onChange={e => setChapterInfo({...chapterInfo, number: e.target.value})}
                        className="w-full bg-[var(--card-app)] border border-[var(--border-app)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                        placeholder="Ví dụ: 101.5"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Tên chương (Tùy chọn)</label>
                      <input 
                        type="text"
                        value={chapterInfo.title}
                        onChange={e => setChapterInfo({...chapterInfo, title: e.target.value})}
                        className="w-full bg-[var(--card-app)] border border-[var(--border-app)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                        placeholder="Ví dụ: Cuộc chiến cuối cùng"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                    {isBulkMode ? '2' : '3'}
                  </span>
                  Tải lên trang truyện
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!isBulkMode && (
                    <div 
                      onClick={() => document.getElementById('chapter-files')?.click()}
                      className="border-2 border-dashed border-[var(--border-app)] rounded-2xl p-8 flex flex-col items-center justify-center hover:border-primary transition-all cursor-pointer bg-[var(--card-app)]/30 group"
                    >
                      <UploadIcon className="text-gray-500 group-hover:text-primary mb-3" size={32} />
                      <p className="font-bold text-sm">Chọn nhiều file</p>
                      <p className="text-xs text-gray-500 mt-1">Chọn thủ công các trang</p>
                      <input 
                        id="chapter-files" type="file" multiple hidden accept="image/*"
                        onChange={handleFileChange}
                      />
                    </div>
                  )}

                  <div 
                    onClick={() => document.getElementById('folder-upload')?.click()}
                    className={cn(
                      "border-2 border-dashed border-[var(--border-app)] rounded-2xl p-8 flex flex-col items-center justify-center hover:border-primary transition-all cursor-pointer bg-[var(--card-app)]/30 group",
                      isBulkMode && "md:col-span-2"
                    )}
                  >
                    <FolderOpen className="text-gray-500 group-hover:text-primary mb-3" size={32} />
                    <p className="font-bold text-sm">{isBulkMode ? 'Tải lên thư mục chứa các chương' : 'Tải lên cả thư mục'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isBulkMode 
                        ? 'Mỗi thư mục con sẽ là một chương (VD: "Chương 1", "Chương 2")' 
                        : 'Tự động lấy tất cả ảnh trong thư mục'}
                    </p>
                    {/* @ts-ignore */}
                    <input 
                      id="folder-upload" type="file" webkitdirectory="" directory="" hidden accept="image/*"
                      onChange={handleFolderUpload}
                    />
                  </div>
                </div>

                {isBulkMode && bulkChapters.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-500 uppercase">Phát hiện {bulkChapters.length} chương</span>
                      <button type="button" onClick={() => setBulkChapters([])} className="text-xs text-red-500 font-bold hover:underline">Xóa tất cả</button>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {bulkChapters.map((chapter, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-[var(--card-app)] border border-[var(--border-app)] rounded-2xl">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                              {chapter.number || '?'}
                            </div>
                            <div>
                              <div className="font-bold text-sm">{chapter.name}</div>
                              <div className="text-[10px] text-gray-500">{chapter.files.length} trang</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {chapter.status === 'uploading' && <Loader2 className="animate-spin text-primary" size={16} />}
                            {(chapter.status === 'success' || chapter.status === 'exists') && <CheckCircle2 className="text-green-500" size={16} />}
                            {chapter.status === 'error' && <AlertCircle className="text-red-500" size={16} />}
                            <span className={cn(
                              "text-[10px] font-bold uppercase",
                              chapter.status === 'pending' && "text-gray-500",
                              chapter.status === 'uploading' && "text-primary",
                              (chapter.status === 'success' || chapter.status === 'exists') && "text-green-500",
                              chapter.status === 'error' && "text-red-500",
                            )}>
                              {chapter.status === 'pending' && 'Chờ tải'}
                              {chapter.status === 'uploading' && 'Đang tải'}
                              {chapter.status === 'success' && 'Hoàn tất'}
                              {chapter.status === 'exists' && 'Đã tồn tại'}
                              {chapter.status === 'error' && 'Lỗi'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isBulkMode && files.length > 0 && (
                  <div className="p-4 bg-[var(--card-app)] border border-[var(--border-app)] rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold text-gray-500 uppercase">{files.length} trang đã chọn</span>
                      <button type="button" onClick={() => setFiles([])} className="text-xs text-red-500 font-bold hover:underline">Xóa tất cả</button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {files.slice(0, 16).map((file, idx) => (
                        <div key={idx} className="aspect-[3/4] bg-gray-800 rounded-md overflow-hidden relative group">
                          <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                          </div>
                        </div>
                      ))}
                      {files.length > 16 && (
                        <div className="aspect-[3/4] bg-gray-800 rounded-md flex items-center justify-center text-xs font-bold text-gray-500">
                          +{files.length - 16}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  type="submit"
                  disabled={uploading || (isBulkMode ? bulkChapters.length === 0 : files.length === 0)}
                  className={cn(
                    "px-10 py-4 rounded-2xl font-bold text-white transition-all flex items-center gap-3 shadow-xl",
                    uploading || (isBulkMode ? bulkChapters.length === 0 : files.length === 0) ? "bg-gray-700 cursor-not-allowed" : "bg-primary hover:bg-primary-dark shadow-primary/20"
                  )}
                >
                  {uploading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin" size={20} />
                      <span className="text-sm">{uploadStatus}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {isBulkMode ? <Layers size={20} /> : <Plus size={20} />}
                      <span>{isBulkMode ? 'Bắt đầu tải lên hàng loạt' : 'Thêm chương vào truyện'}</span>
                    </div>
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      {/* Success Message Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-green-500 text-white px-6 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 size={20} />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
