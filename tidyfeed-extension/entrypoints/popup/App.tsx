function App() {
  return (
    <div className="min-h-[400px] min-w-[320px] bg-zinc-900 text-white p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-lg font-bold">TF</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">TidyFeed</h1>
          <p className="text-xs text-zinc-400">AdBlock & Downloader</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">🚀 Status</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-400">Active on X.com</span>
          </div>
        </div>

        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">⚙️ Quick Settings</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-zinc-400">Hide Promoted Posts</span>
              <div className="relative">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-zinc-600 rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-zinc-400">Show Download Button</span>
              <div className="relative">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-zinc-600 rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
              </div>
            </label>
          </div>
        </div>

        <div className="text-center text-xs text-zinc-500 pt-2">
          v0.0.1 • Made with ❤️
        </div>
      </div>
    </div>
  );
}

export default App;
