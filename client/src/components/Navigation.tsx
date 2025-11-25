const items = ["Overview", "Strategies", "Trades", "Benchmarks"];

function Navigation() {
  return (
    <nav className="flex gap-3 text-sm text-slate-600">
      {items.map(item => (
        <span
          key={item}
          className="px-3 py-1 rounded-full bg-white shadow-sm border border-slate-200"
        >
          {item}
        </span>
      ))}
    </nav>
  );
}

export default Navigation;
