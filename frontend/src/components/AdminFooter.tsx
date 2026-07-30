export default function AdminFooter() {
  return (
    <footer className="border-t border-gray-800 bg-black">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <p className="text-center text-xs text-zinc-600 font-medium">
          Web Developed with <span className="text-red-500 text-sm align-middle">&hearts;</span> by{' '}
          <a
            href="https://bits.co.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Banten IT Solutions
          </a>
        </p>
      </div>
    </footer>
  );
}
