#!/usr/bin/env python3
"""
Fetch ALL historical Fear & Greed Index data from alternative.me API.
Saves to data/training/fear-greed-history.json

Format: array of {timestamp, value (0-100), classification}
"""

import json
import os
import requests
import time
from datetime import datetime, timezone

OUTPUT_PATH = "data/training/fear-greed-history.json"

def classify(value):
    """Classify Fear & Greed value into human-readable label."""
    v = int(value)
    if v <= 24:
        return "Extreme Fear"
    elif v <= 44:
        return "Fear"
    elif v <= 55:
        return "Neutral"
    elif v <= 74:
        return "Greed"
    else:
        return "Extreme Greed"

def fetch_fear_greed():
    """Fetch all historical Fear & Greed Index data."""
    url = "https://api.alternative.me/fng/?limit=0&format=json"

    print("Fetching Fear & Greed Index history...")

    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching data: {e}")
        return None

    raw = resp.json()

    if "data" not in raw:
        print(f"Unexpected response format: {list(raw.keys())}")
        return None

    records = []
    for entry in raw["data"]:
        ts = int(entry["timestamp"])
        value = int(entry["value"])
        classification = entry.get("value_classification", classify(value))

        records.append({
            "timestamp": ts,
            "date": datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d"),
            "value": value,
            "classification": classification,
        })

    # Sort chronologically (API returns newest first)
    records.sort(key=lambda r: r["timestamp"])

    return records

def main():
    records = fetch_fear_greed()
    if records is None:
        return

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(records, f, indent=2)

    size_mb = os.path.getsize(OUTPUT_PATH) / 1024 / 1024

    print(f"\nSaved {len(records)} records to {OUTPUT_PATH} ({size_mb:.2f} MB)")
    print(f"Date range: {records[0]['date']} -> {records[-1]['date']}")

    # Print distribution
    from collections import Counter
    dist = Counter(r["classification"] for r in records)
    print("\nDistribution:")
    for label in ["Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"]:
        count = dist.get(label, 0)
        pct = count / len(records) * 100
        print(f"  {label:15s}: {count:5d} ({pct:5.1f}%)")

    # Show recent values
    print("\nRecent values:")
    for r in records[-5:]:
        print(f"  {r['date']}: {r['value']:3d} ({r['classification']})")

if __name__ == "__main__":
    main()
