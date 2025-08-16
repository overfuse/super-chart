export default function Header() {
  return (
    <header className="pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-yellow-400 shadow-sm">
            <img src={`${import.meta.env.BASE_URL}superchart-favicon.svg`} alt="Logo" className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-yellow-500 bg-clip-text text-transparent">
              Super Chart
            </h1>
            <p className="text-xs text-gray-500">High‑volume time‑series viewer</p>
          </div>
        </div>
      </div>
      <div className="mt-4 h-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-yellow-400" />
    </header>
  );
}