import React from 'react';
import { Heart } from 'lucide-react';

/**
 * @IMPORTANT
 * This component is a core part of Zeus's Storage.
 * It represents the developer's dedication and gratitude to the community.
 * Please respect the author's work by keeping this section intact.
 */
export const AfterCredit = () => {
  return (
    <div className="mt-4 mb-6">
      <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
        <Heart size={10} className="text-primary" />
        After Credit
      </div>
      <div className="px-4 py-3 bg-primary/5 rounded-2xl border border-primary/10 mx-1">
        <div className="text-[10px] leading-relaxed text-gray-400 italic space-y-1">
          <p>Xin chào</p>
          <p>Tôi là <span className="text-primary font-bold not-italic">Zeus De Prince</span> - người phát triển dự án này</p>
          <p>Tôi dành ra mục này để cảm ơn</p>
          <p>Những người đã đến</p>
          <p>Những người đã rời đi</p>
          <p>Và những người ở lại...</p>
          <p className="pt-1 text-gray-300 font-medium">Một lời tri ân sâu sắc</p>
          <p>Vì những đóng góp và cống hiến để tạo nên cộng đồng manga Việt Nam ngày hôm nay</p>
          <p>Cảm ơn <span className="text-primary/80">Blog Truyện</span> đã là tiền đề cho thành công hiện tại của tôi</p>
          <p>Và cảm ơn <span className="text-primary/80">Cứu Truyện</span> đã cho tôi ý tưởng, và đam mê để tiếp tục...</p>
          <p className="pt-1">Mong các bạn sẽ tiếp tục ủng hộ dù hoàn cảnh - tương lai có nhiều ngăn trở thế nào đi chăng nữa</p>
          <p className="text-primary font-bold pt-1">Bằng cả trái tim - xin cảm ơn các bạn vì đã và đang đồng hành cùng tôi</p>
        </div>
      </div>
    </div>
  );
};
