"""
Fetch benchmark history via yfinance and emit CSVs that match the Manus benchmark ingestion format.

Note: yfinance is an unofficial Yahoo Finance API wrapper and is subject to Yahoo’s terms of use and potential rate limits.
"""

import argparse
import datetime as dt
from pathlib import Path
import sys

try:
    import yfinance as yf
except ImportError:  # pragma: no cover - helper script convenience
    print("yfinance is required. Install with `pip install yfinance`.", file=sys.stderr)
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(description="Download benchmark history into CSVs")
    parser.add_argument("--symbols", required=True, help="Comma-separated list of tickers (e.g., SPY,QQQ,^VIX)")
    parser.add_argument("--start", required=True, help="Start date YYYY-MM-DD")
    parser.add_argument("--end", help="End date YYYY-MM-DD (default today)")
    parser.add_argument("--interval", default="1d", help="Sampling interval (default 1d)")
    parser.add_argument("--out", default="data/benchmarks", help="Output directory for CSV files")
    return parser.parse_args()


def fetch_and_save(symbol: str, start: str, end: str, interval: str, out_dir: Path):
    data = yf.download(symbol, start=start, end=end or None, interval=interval, progress=False)
    if data.empty:
        print(f"No data returned for {symbol}; skipping", file=sys.stderr)
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    output_path = out_dir / f"{symbol.replace('^', '')}_benchmark.csv"

    with output_path.open("w", encoding="utf-8") as f:
        f.write("symbol,date,close\n")
        for idx, row in data.iterrows():
            date_str = idx.strftime("%Y-%m-%d")
            close = row.get("Close")
            if close is None or (isinstance(close, float) and (close != close)):  # NaN guard
                continue
            f.write(f"{symbol},{date_str},{close}\n")

    print(f"Saved {symbol} to {output_path}")


def main():
    args = parse_args()
    try:
        dt.datetime.fromisoformat(args.start)
        if args.end:
            dt.datetime.fromisoformat(args.end)
    except ValueError:
        print("Dates must be in YYYY-MM-DD format", file=sys.stderr)
        sys.exit(1)

    symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]
    if not symbols:
        print("At least one symbol is required", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.out)
    for sym in symbols:
        try:
            fetch_and_save(sym, args.start, args.end, args.interval, out_dir)
        except Exception as exc:  # pragma: no cover - CLI helper resilience
            print(f"Error fetching {sym}: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
