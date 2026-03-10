#!/usr/bin/env python3
"""
Fetch historical funding rates from Binance Futures for BTC, ETH, SOL.
Paginates through all history and saves to data/training/funding-rates.json

Format: array of {symbol, fundingRate, fundingTime, timestamp}
"""

import json
import os
import requests
import time
from datetime import datetime, timezone

OUTPUT_PATH = "data/training/funding-rates.json"

SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

# Start from Jan 2024 to ensure we cover our training data range (Feb-Mar 2026)
START_MS = int(datetime(2024, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)


def fetch_funding_rates_for_symbol(symbol):
    """Fetch all historical funding rates for a symbol by paginating."""
    all_rates = []
    start_time = START_MS

    print(f"  Fetching {symbol}...", end="", flush=True)

    while True:
        url = (
            f"https://fapi.binance.com/fapi/v1/fundingRate"
            f"?symbol={symbol}&startTime={start_time}&limit=1000"
        )

        try:
            resp = requests.get(url, timeout=15)

            if resp.status_code == 429:
                print(" [rate limited, waiting 60s]", end="", flush=True)
                time.sleep(60)
                continue

            if resp.status_code != 200:
                print(f" [HTTP {resp.status_code}]")
                break

            data = resp.json()

            if not data:
                break

            for entry in data:
                all_rates.append({
                    "symbol": symbol.replace("USDT", ""),
                    "fundingRate": float(entry["fundingRate"]),
                    "fundingTime": entry["fundingTime"],
                    "timestamp": entry["fundingTime"] // 1000,
                    "date": datetime.fromtimestamp(
                        entry["fundingTime"] / 1000, tz=timezone.utc
                    ).strftime("%Y-%m-%d %H:%M"),
                })

            # Move past the last entry's timestamp
            start_time = data[-1]["fundingTime"] + 1

            # Respect rate limits
            time.sleep(0.2)

        except requests.RequestException as e:
            print(f" [error: {e}]", end="", flush=True)
            time.sleep(5)
            continue

    print(f" {len(all_rates)} records")
    return all_rates


def main():
    print("Fetching Binance Futures funding rates...\n")

    all_rates = []

    for symbol in SYMBOLS:
        rates = fetch_funding_rates_for_symbol(symbol)
        all_rates.extend(rates)

    # Sort by timestamp then symbol
    all_rates.sort(key=lambda r: (r["timestamp"], r["symbol"]))

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(all_rates, f, indent=2)

    size_mb = os.path.getsize(OUTPUT_PATH) / 1024 / 1024

    print(f"\nSaved {len(all_rates)} records to {OUTPUT_PATH} ({size_mb:.2f} MB)")

    if all_rates:
        dates = [r["date"] for r in all_rates]
        print(f"Date range: {dates[0]} -> {dates[-1]}")

    # Stats per symbol
    print("\nRecords per symbol:")
    from collections import Counter, defaultdict
    symbol_counts = Counter(r["symbol"] for r in all_rates)
    for sym, count in sorted(symbol_counts.items()):
        rates = [r["fundingRate"] for r in all_rates if r["symbol"] == sym]
        avg_rate = sum(rates) / len(rates) if rates else 0
        print(f"  {sym:5s}: {count:6d} records, avg rate: {avg_rate:+.6f}")

    # Show recent values
    print("\nRecent funding rates:")
    for r in all_rates[-6:]:
        pct = r["fundingRate"] * 100
        direction = "longs pay" if r["fundingRate"] > 0 else "shorts pay"
        print(f"  {r['date']} {r['symbol']:5s}: {pct:+.4f}% ({direction})")


if __name__ == "__main__":
    main()
