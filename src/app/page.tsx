export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0b0f17] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full glass-card p-10 rounded-3xl border border-[#ffdc82]/20 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#c33624]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#ffdc82]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#131924] border border-[#ffdc82]/30 mb-6 text-[#ffdc82] font-accent text-3xl shadow-inner">
          404
        </div>

        <h1 className="text-3xl sm:text-4xl font-accent text-white mb-4 leading-tight">
          Ви не туди потрапили
        </h1>

        <p className="text-[#8e9bb0] text-base leading-relaxed">
          Цієї сторінки не існує або доступ до неї обмежено. будь ласка, перевірте правильність введеного URL-адресу.
        </p>
      </div>
    </main>
  );
}
