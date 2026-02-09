
import React from 'react';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 relative selection:bg-amber-100 overflow-hidden">
      
      {/* Overlay لتسهيل القراءة عند الحاجة دون إخفاء جمال الخلفية */}
      <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>

      <header className="w-full max-w-4xl mt-8 mb-10 text-center px-4 relative z-10">
        <div className="relative inline-block flex flex-col items-center">
          {/* استخدام الشعار الجديد */}
          <Logo className="w-24 h-24 md:w-32 md:h-32 mb-4" />
          
          <h1 className="text-6xl md:text-8xl font-amiri font-bold text-[#c5a059] mb-2 tracking-tight drop-shadow-md">
            {title || "مسابقة الأنوار"}
          </h1>
          <div className="flex items-center justify-center gap-4 opacity-70">
            <div className="h-[2px] w-16 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent"></div>
            <span className="text-[#c5a059] text-2xl font-bold">✧</span>
            <div className="h-[2px] w-16 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent"></div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl glass-card rounded-[3.5rem] p-6 md:p-14 relative z-10 flex-1 flex flex-col mb-20 overflow-hidden border border-amber-200/40">
        {/* إطار داخلي ذهبي رفيع */}
        <div className="absolute inset-4 border border-amber-600/10 rounded-[3rem] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col h-full min-h-[500px]">
          {children}
        </div>
      </main>

      <footer className="mt-auto py-8 text-[#c5a059] flex flex-col items-center gap-2 relative z-10">
        <div className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-[0.5em] opacity-80">
          <span>إيمان</span>
          <span className="text-amber-500">✦</span>
          <span>علم</span>
          <span className="text-amber-500">✦</span>
          <span>نور</span>
        </div>
        <p className="font-amiri text-2xl italic mt-1 font-medium opacity-60">"وقل ربِّ زدني علماً"</p>
      </footer>
    </div>
  );
};

export default Layout;
