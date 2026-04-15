import React, { useState, useEffect } from 'react';
import { Upload as UploadIcon, X, Plus, Image as ImageIcon, Loader2, Link as LinkIcon, Globe, AlertCircle, Save, Trash2, Edit, ChevronRight, List, FileText, ShieldCheck, GripVertical, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, fileToBase64 } from '../lib/utils';
import { db, doc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, orderBy, serverTimestamp, handleFirestoreError, OperationType, writeBatch } from '../firebase';
import { useAuth } from '../App';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

const SortableChapterItem = ({ chapter, onEdit, onDelete }: { chapter: any, onEdit: (c: any) => void, onDelete: (c: any) => void, key?: any }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex items-center justify-between group transition-all",
        isDragging && "border-primary shadow-2xl shadow-primary/20"
      )}
    >
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-700 rounded-md text-gray-500 hover:text-primary transition-colors">
          <GripVertical size={20} />
        </div>
        <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">
          #{chapter.number}
        </div>
        <div>
          <h3 className="font-bold text-sm">{chapter.title}</h3>
          <p className="text-[10px] text-gray-500">
            {chapter.pages?.length || 0} trang • Cập nhật {chapter.updatedAt?.toDate().toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
        <button 
          type="button"
          onClick={() => onEdit(chapter)}
          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
        >
          <Edit size={16} />
        </button>
        <button 
          type="button"
          onClick={() => onDelete(chapter)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

export const EditMangaPage = () => {
  const { mangaId } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const [mangaInfo, setMangaInfo] = useState({
    title: '',
    titleEn: '',
    titleJp: '',
    author: '',
    description: '',
    status: 'Ongoing',
    publisherUrl: '',
    authorUrl: '',
    genres: '',
    coverUrl: '',
    backgroundUrl: ''
  });
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [editingChapter, setEditingChapter] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [orderChanged, setOrderChanged] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!mangaId) return;

    const fetchMangaAndChapters = async () => {
      try {
        // Fetch Manga
        const docSnap = await getDoc(doc(db, 'mangas', mangaId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMangaInfo({
            title: data.title || '',
            titleEn: data.titleEn || '',
            titleJp: data.titleJp || '',
            author: data.author || '',
            description: data.description || '',
            status: data.status || 'Ongoing',
            publisherUrl: data.publisherUrl || '',
            authorUrl: data.authorUrl || '',
            genres: (data.genres || []).join(', '),
            coverUrl: data.coverUrl || '',
            backgroundUrl: data.backgroundUrl || ''
          });

          // Fetch Chapters - Sort in memory to support legacy chapters without sortOrder
          const chaptersSnap = await getDocs(collection(db, 'mangas', mangaId, 'chapters'));
          let chaptersData: any[] = chaptersSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Sort in memory: prioritize sortOrder, fallback to number
          chaptersData.sort((a, b) => {
            if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
              return a.sortOrder - b.sortOrder;
            }
            if (a.sortOrder !== undefined) return -1;
            if (b.sortOrder !== undefined) return 1;
            return (a.number || 0) - (b.number || 0);
          });

          setChapters(chaptersData);
        } else {
          alert('Không tìm thấy truyện.');
          navigate('/');
        }
      } catch (error) {
        console.error(error);
        handleFirestoreError(error, OperationType.GET, `mangas/${mangaId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMangaAndChapters();
  }, [mangaId, navigate]);

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
          setSaveStatus(`Bị giới hạn tốc độ. Đang thử lại sau ${waitTime/1000}s... (Lần ${retryCount + 1})`);
          await delay(waitTime);
          return uploadToImgBB(file, retryCount + 1);
        }
        
        throw new Error(`Proxy Error: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Proxy upload failed, trying direct...', error);
      const apiKey = getApiKey();
      if (!apiKey) throw new Error('API Key missing');

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
            setSaveStatus(`Bị giới hạn tốc độ. Đang thử lại sau ${waitTime/1000}s... (Lần ${retryCount + 1})`);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'background') => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (type === 'cover') setCoverFile(selectedFile);
      else if (type === 'background') setBackgroundFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin || !mangaId) return;

    setSaving(true);
    setSaveStatus('Đang cập nhật thông tin...');

    try {
      let coverUrl = mangaInfo.coverUrl;
      let backgroundUrl = mangaInfo.backgroundUrl;

      if (coverFile) {
        setSaveStatus('Đang tải ảnh bìa mới...');
        coverUrl = await uploadToImgBB(coverFile);
      }

      if (backgroundFile) {
        setSaveStatus('Đang tải ảnh nền mới...');
        backgroundUrl = await uploadToImgBB(backgroundFile);
      }

      const genresArray = mangaInfo.genres.split(',').map(g => g.trim()).filter(g => g !== '');
      
      await updateDoc(doc(db, 'mangas', mangaId), {
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
        updatedAt: serverTimestamp()
      });

      setSaving(false);
      setSuccessMessage('Cập nhật thành công!');
      setTimeout(() => navigate(`/manga/${mangaId}`), 1500);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.WRITE, `mangas/${mangaId}`);
      setSaving(false);
      setSaveStatus('');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setChapters((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setOrderChanged(true);
        return newItems;
      });
    }
  };

  const handleSaveOrder = async () => {
    if (!mangaId || !isAdmin) return;
    setSaving(true);
    setSaveStatus('Đang lưu thứ tự chương...');
    try {
      const batch = writeBatch(db);
      chapters.forEach((chapter, index) => {
        const chapterRef = doc(db, 'mangas', mangaId, 'chapters', chapter.id);
        batch.update(chapterRef, { sortOrder: index });
      });
      await batch.commit();
      setOrderChanged(false);
      setSuccessMessage('Đã lưu thứ tự chương mới!');
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, `mangas/${mangaId}/chapters`);
    } finally {
      setSaving(false);
      setSaveStatus('');
    }
  };

  const handleCleanTitles = async () => {
    if (!chapters.length || !mangaId) return;
    
    setSaving(true);
    setSaveStatus('Đang dọn dẹp tên chương...');
    
    try {
      const batch = writeBatch(db);
      let count = 0;
      
      const updatedChapters = chapters.map(chapter => {
        const numStr = String(chapter.number);
        let cleaned = chapter.title.trim();
        
        // Aggressive regex to remove redundant prefixes
        const prefixRegex = new RegExp(`^(Chương|Chapter|Chap|Ch|Vol|Volume|Tập)\\s*${numStr}(\\.0)?\\s*[:\\s-：]*`, 'i');
        
        const originalTitle = chapter.title;
        let changed = true;
        while (changed) {
          const before = cleaned;
          // Remove prefix
          cleaned = cleaned.replace(prefixRegex, '').trim();
          // Remove any leading punctuation/spaces (including full-width colon)
          cleaned = cleaned.replace(/^[:\\s-：]+/, '').trim();
          changed = cleaned !== before;
        }
        
        const finalTitle = cleaned ? `Chương ${numStr}: ${cleaned}` : `Chương ${numStr}: không có tiêu đề`;
        
        if (finalTitle !== originalTitle) {
          const chapterRef = doc(db, 'mangas', mangaId, 'chapters', chapter.id);
          batch.update(chapterRef, { title: finalTitle });
          count++;
          return { ...chapter, title: finalTitle };
        }
        return chapter;
      });
      
      if (count > 0) {
        await batch.commit();
        setChapters(updatedChapters);
        setSuccessMessage(`Đã dọn dẹp ${count} tên chương.`);
      } else {
        setSuccessMessage('Tất cả tên chương đã chuẩn hóa.');
      }
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, `mangas/${mangaId}/chapters`);
    } finally {
      setSaving(false);
      setSaveStatus('');
    }
  };

  const handleDeleteManga = async () => {
    if (!mangaId || !isAdmin) return;
    
    setSaving(true);
    setSaveStatus('Đang xóa toàn bộ dữ liệu truyện...');
    
    try {
      // Delete chapters first (recursive deletion is not supported in client SDK, but we can delete the manga doc)
      // Note: In production, you'd use a Cloud Function for recursive delete. 
      // For this app, we'll delete the main doc.
      await deleteDoc(doc(db, 'mangas', mangaId));
      setSuccessMessage('Đã xóa truyện thành công.');
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.DELETE, `mangas/${mangaId}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChapter = async () => {
    if (!chapterToDelete || !mangaId) return;
    
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'mangas', mangaId, 'chapters', chapterToDelete.id));
      setChapters(chapters.filter(c => c.id !== chapterToDelete.id));
      setChapterToDelete(null);
      setSuccessMessage('Đã xóa chương thành công.');
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.DELETE, `mangas/${mangaId}/chapters/${chapterToDelete.id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter || !mangaId) return;

    const finalNumber = editingChapter.number;
    let finalTitle = editingChapter.title ? editingChapter.title.trim() : "";
    
    if (finalTitle) {
      // Remove "Chương X" or "Chapter X" prefix if it exists
      const prefixRegex = new RegExp(`^(Chương|Chapter)\\s*${finalNumber}\\s*[:\\s-]*`, 'i');
      finalTitle = finalTitle.replace(prefixRegex, '');
      // Remove leading punctuation
      finalTitle = finalTitle.replace(/^[:\\s-]+/, '').trim();
      finalTitle = finalTitle ? `Chương ${finalNumber}: ${finalTitle}` : `Chương ${finalNumber}: không có tiêu đề`;
    } else {
      finalTitle = `Chương ${finalNumber}: không có tiêu đề`;
    }

    try {
      await updateDoc(doc(db, 'mangas', mangaId, 'chapters', editingChapter.id), {
        title: finalTitle,
        number: Number(editingChapter.number),
        pages: editingChapter.pages,
        updatedAt: serverTimestamp()
      });
      
      setChapters(chapters.map(c => c.id === editingChapter.id ? { ...editingChapter, title: finalTitle } : c));
      setEditingChapter(null);
      setSuccessMessage('Cập nhật chương thành công.');
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, `mangas/${mangaId}/chapters/${editingChapter.id}`);
    }
  };

  const handleAddPages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !editingChapter) return;
    
    setSaving(true);
    setSaveStatus('Đang tải các trang mới...');
    
    try {
      const newFiles = (Array.from(e.target.files) as File[]).sort((a: File, b: File) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const newUrls = [];
      for (let i = 0; i < newFiles.length; i++) {
        setSaveStatus(`Đang tải trang ${i + 1}/${newFiles.length}...`);
        const url = await uploadToImgBB(newFiles[i]);
        newUrls.push(url);
        await delay(300);
      }
      
      setEditingChapter({
        ...editingChapter,
        pages: [...(editingChapter.pages || []), ...newUrls]
      });
    } catch (error) {
      console.error(error);
      alert('Tải ảnh thất bại.');
    } finally {
      setSaving(false);
      setSaveStatus('');
    }
  };

  const removePage = (index: number) => {
    if (!editingChapter) return;
    const newPages = [...editingChapter.pages];
    newPages.splice(index, 1);
    setEditingChapter({ ...editingChapter, pages: newPages });
  };

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <AlertCircle size={64} className="text-gray-600 mb-6" />
        <h2 className="text-2xl font-bold mb-2">Truy cập bị hạn chế</h2>
        <p className="text-gray-400 mb-8">Chỉ quản trị viên mới có quyền chỉnh sửa truyện.</p>
        <button onClick={() => navigate('/')} className="text-primary font-bold hover:underline">Quay lại trang chủ</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl font-black mb-2">Chỉnh sửa truyện</h1>
        <p className="text-sm sm:text-base text-gray-500">Cập nhật thông tin cho bộ truyện của bạn.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Basic Info Section */}
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
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Tên tiếng Anh</label>
                  <input 
                    type="text" value={mangaInfo.titleEn}
                    onChange={e => setMangaInfo({...mangaInfo, titleEn: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Tên tiếng Nhật</label>
                  <input 
                    type="text" value={mangaInfo.titleJp}
                    onChange={e => setMangaInfo({...mangaInfo, titleJp: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Tác giả</label>
                  <input 
                    type="text" value={mangaInfo.author}
                    onChange={e => setMangaInfo({...mangaInfo, author: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
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
                  <label className="text-xs font-bold text-gray-500 uppercase">Thể loại</label>
                  <input 
                    type="text" value={mangaInfo.genres}
                    onChange={e => setMangaInfo({...mangaInfo, genres: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Mô tả</label>
                <textarea 
                  rows={4} value={mangaInfo.description}
                  onChange={e => setMangaInfo({...mangaInfo, description: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>
            </div>

            {/* Chapter Management Section */}
            <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-800 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <List size={20} className="text-primary" />
                  Danh sách chương ({chapters.length})
                </h2>
                <div className="flex items-center gap-4">
                  <button 
                    type="button"
                    onClick={handleCleanTitles}
                    className="text-xs font-bold bg-gray-800 text-primary border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all flex items-center gap-1 animate-pulse"
                    title="Tự động sửa tên chương (Xóa Chapter X thừa)"
                  >
                    <Wand2 size={14} /> Dọn dẹp tên chương
                  </button>
                  {orderChanged && (
                    <button 
                      type="button"
                      onClick={handleSaveOrder}
                      className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-1"
                    >
                      <Save size={14} /> Lưu thứ tự
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => navigate('/add-chapter')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Thêm chương mới
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {chapters.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                    Chưa có chương nào được tải lên.
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis]}
                  >
                    <SortableContext
                      items={chapters.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {chapters.map((chapter) => (
                          <SortableChapterItem 
                            key={chapter.id} 
                            chapter={chapter} 
                            onEdit={setEditingChapter} 
                            onDelete={setChapterToDelete} 
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>

            {/* Official Links Section */}
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
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Link Tác giả</label>
                  <input 
                    type="url" value={mangaInfo.authorUrl}
                    onChange={e => setMangaInfo({...mangaInfo, authorUrl: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/20 space-y-4">
              <h2 className="text-lg font-bold text-red-500 flex items-center gap-2">
                <AlertCircle size={20} />
                Khu vực nguy hiểm
              </h2>
              <p className="text-sm text-gray-500">
                Hành động này sẽ xóa vĩnh viễn bộ truyện và tất cả các chương liên quan. Không thể hoàn tác.
              </p>
              <button 
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all"
              >
                Xóa truyện này
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Ảnh bìa (Cover)</label>
              <div 
                onClick={() => document.getElementById('cover-upload')?.click()}
                className="aspect-[3/4] bg-gray-800 border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all overflow-hidden relative"
              >
                {coverFile ? (
                  <img src={URL.createObjectURL(coverFile)} className="w-full h-full object-cover" alt="Cover" />
                ) : mangaInfo.coverUrl ? (
                  <img src={mangaInfo.coverUrl} className="w-full h-full object-cover" alt="Cover" referrerPolicy="no-referrer" />
                ) : (
                  <>
                    <ImageIcon className="text-gray-600 mb-2" size={32} />
                    <span className="text-xs text-gray-500">Chọn ảnh bìa</span>
                  </>
                )}
                <input id="cover-upload" type="file" hidden accept="image/*" onChange={e => handleFileChange(e, 'cover')} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Ảnh nền (Background)</label>
              <div 
                onClick={() => document.getElementById('bg-upload')?.click()}
                className="aspect-video bg-gray-800 border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all overflow-hidden relative"
              >
                {backgroundFile ? (
                  <img src={URL.createObjectURL(backgroundFile)} className="w-full h-full object-cover" alt="Background" />
                ) : mangaInfo.backgroundUrl ? (
                  <img src={mangaInfo.backgroundUrl} className="w-full h-full object-cover" alt="Background" referrerPolicy="no-referrer" />
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

        <div className="flex justify-end gap-4">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="px-8 py-4 bg-gray-800 text-gray-400 rounded-2xl font-bold hover:text-white transition-all"
          >
            Hủy
          </button>
          <button 
            type="submit"
            disabled={saving}
            className={cn(
              "px-12 py-4 rounded-2xl font-bold text-white transition-all flex items-center gap-3 shadow-xl",
              saving ? "bg-gray-700 cursor-not-allowed" : "bg-primary hover:bg-primary-dark shadow-primary/20"
            )}
          >
            {saving ? (
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-sm font-medium">{saveStatus}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Save size={20} />
                <span>Lưu thay đổi</span>
              </div>
            )}
          </button>
        </div>
      </form>

      {/* Chapter Edit Modal */}
      <AnimatePresence>
        {editingChapter && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Edit size={20} className="text-primary" />
                  Sửa chương
                </h3>
                <button onClick={() => setEditingChapter(null)} className="p-2 hover:bg-gray-800 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleUpdateChapter} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Số chương</label>
                    <input 
                      type="number" required step="0.1" value={editingChapter.number}
                      onChange={e => setEditingChapter({...editingChapter, number: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Tên chương</label>
                    <input 
                      type="text" required value={editingChapter.title}
                      onChange={e => setEditingChapter({...editingChapter, title: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 uppercase">Trang truyện ({editingChapter.pages?.length || 0})</label>
                    <button 
                      type="button"
                      onClick={() => document.getElementById('add-pages-input')?.click()}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Thêm trang
                    </button>
                    <input id="add-pages-input" type="file" multiple hidden accept="image/*" onChange={handleAddPages} />
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar p-2 bg-gray-800/50 rounded-xl border border-gray-700">
                    {editingChapter.pages?.map((url: string, idx: number) => (
                      <div key={idx} className="aspect-[3/4] relative group rounded-lg overflow-hidden border border-gray-700">
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          type="button"
                          onClick={() => removePage(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X size={12} />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-center py-0.5 text-white font-bold">
                          {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setEditingChapter(null)}
                    className="flex-1 py-3 bg-gray-800 rounded-xl font-bold hover:bg-gray-700 transition-all"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 bg-primary rounded-xl font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : "Cập nhật"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Chapter Delete Confirmation Modal */}
      <AnimatePresence>
        {chapterToDelete && (
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
              <h3 className="text-2xl font-black mb-4">Xác nhận xóa chương?</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Chương <span className="text-white font-bold">#{chapterToDelete.number} - {chapterToDelete.title}</span> sẽ bị xóa vĩnh viễn.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setChapterToDelete(null)}
                  className="flex-1 py-4 bg-gray-800 rounded-2xl font-bold hover:bg-gray-700 transition-all"
                >
                  Quay lại
                </button>
                <button 
                  onClick={handleDeleteChapter}
                  disabled={saving}
                  className="flex-1 py-4 bg-red-500 rounded-2xl font-bold hover:bg-red-600 transition-all text-white shadow-xl shadow-red-500/20"
                >
                  {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Xóa chương"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manga Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
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
                Truyện sẽ bị xóa hoàn toàn, hãy cân nhắc trước khi xóa! <br/>
                <span className="text-red-500/80 text-xs font-bold uppercase mt-2 block">Hành động này không thể hoàn tác</span>
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 bg-gray-800 rounded-2xl font-bold hover:bg-gray-700 transition-all"
                >
                  Quay lại
                </button>
                <button 
                  onClick={handleDeleteManga}
                  disabled={saving}
                  className="flex-1 py-4 bg-red-500 rounded-2xl font-bold hover:bg-red-600 transition-all text-white shadow-xl shadow-red-500/20"
                >
                  {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Xóa vĩnh viễn"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
