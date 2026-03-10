#!/usr/bin/env python3
"""
Enrich GemBots training datasets with sentiment signals:
  - Fear & Greed Index (daily)
  - Binance Funding Rates (8h intervals for BTC/ETH/SOL)

Reads:
  data/training/dpo-dataset.jsonl
  data/training/sft-dataset.jsonl
  data/training/fear-greed-history.json
  data/training/funding-rates.json

Outputs:
  data/training/enriched-train.jsonl
  data/training/enriched-val.jsonl

Usage:
  python3 scripts/enrich-sentiment.py [--sample 3] [--split 0.9]
"""

import json
import os
import random
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone

DATA_DIR = "data/training"
FNG_PATH = os.path.join(DATA_DIR, "fear-greed-history.json")
FUNDING_PATH = os.path.join(DATA_DIR, "funding-rates.json")
DPO_PATH = os.path.join(DATA_DIR, "dpo-dataset.jsonl")
SFT_PATH = os.path.join(DATA_DIR, "sft-dataset.jsonl")
OUT_TRAIN = os.path.join(DATA_DIR, "enriched-train.jsonl")
OUT_VAL = os.path.join(DATA_DIR, "enriched-val.jsonl")


def load_fng_index():
    """Load Fear & Greed data into a date->record lookup."""
    if not os.path.exists(FNG_PATH):
        print(f"Warning: {FNG_PATH} not found. Run fetch-fear-greed.py first.")
        return {}

    with open(FNG_PATH) as f:
        records = json.load(f)

    # Build date string -> record lookup
    lookup = {}
    for r in records:
        lookup[r["date"]] = r

    print(f"Loaded {len(lookup)} Fear & Greed records")
    return lookup


def load_funding_rates():
    """Load funding rates into a (symbol, timestamp) sorted list for binary search."""
    if not os.path.exists(FUNDING_PATH):
        print(f"Warning: {FUNDING_PATH} not found. Run fetch-funding-rates.py first.")
        return {}

    with open(FUNDING_PATH) as f:
        records = json.load(f)

    # Group by symbol, sorted by timestamp
    by_symbol = defaultdict(list)
    for r in records:
        by_symbol[r["symbol"]].append(r)

    for sym in by_symbol:
        by_symbol[sym].sort(key=lambda r: r["timestamp"])

    total = sum(len(v) for v in by_symbol.values())
    print(f"Loaded {total} funding rate records for {list(by_symbol.keys())}")
    return dict(by_symbol)


def find_closest_funding(rates_list, ts_unix):
    """Binary search for closest funding rate to a unix timestamp."""
    if not rates_list:
        return None

    lo, hi = 0, len(rates_list) - 1

    # Clamp to range
    if ts_unix <= rates_list[0]["timestamp"]:
        return rates_list[0]
    if ts_unix >= rates_list[-1]["timestamp"]:
        return rates_list[-1]

    while lo < hi:
        mid = (lo + hi) // 2
        if rates_list[mid]["timestamp"] < ts_unix:
            lo = mid + 1
        else:
            hi = mid

    # Compare lo and lo-1 to find closest
    if lo > 0:
        d1 = abs(rates_list[lo]["timestamp"] - ts_unix)
        d2 = abs(rates_list[lo - 1]["timestamp"] - ts_unix)
        if d2 < d1:
            return rates_list[lo - 1]

    return rates_list[lo]


def parse_timestamp(ts_str):
    """Parse various timestamp formats from our datasets."""
    if not ts_str:
        return None

    ts_str = ts_str.strip()

    # Fix short timezone offset: "+00" -> "+00:00"
    import re
    ts_str = re.sub(r'([+-]\d{2})$', r'\1:00', ts_str)

    try:
        dt = datetime.fromisoformat(ts_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        pass

    for fmt in [
        "%Y-%m-%d %H:%M:%S.%f%z",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
    ]:
        try:
            dt = datetime.strptime(ts_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue

    return None


def build_sentiment_line(fng_record, funding_record, token):
    """Build the sentiment context string to inject into prompts."""
    parts = []

    if fng_record:
        parts.append(
            f"Market Sentiment: Fear & Greed Index = {fng_record['value']} "
            f"({fng_record['classification']})"
        )

    if funding_record:
        rate_pct = funding_record["fundingRate"] * 100
        direction = "positive = longs paying shorts" if funding_record["fundingRate"] >= 0 else "negative = shorts paying longs"
        sym = funding_record["symbol"]
        parts.append(f"Funding Rate: {sym} {rate_pct:+.4f}% ({direction})")

    return "\n".join(parts)


def inject_sentiment_into_prompt(prompt_text, sentiment_line):
    """Inject sentiment context into a prompt string, before the prediction instruction."""
    if not sentiment_line:
        return prompt_text

    # Insert before "Predict the price" or at the end of the market data block
    insert_markers = [
        "\nPredict the price",
        "\nPredict ",
        "\nInclude your",
        "\nGive a",
    ]

    for marker in insert_markers:
        idx = prompt_text.find(marker)
        if idx > 0:
            return prompt_text[:idx] + "\n" + sentiment_line + prompt_text[idx:]

    # Fallback: append before last line
    lines = prompt_text.rstrip().split("\n")
    lines.insert(-1, sentiment_line)
    return "\n".join(lines)


def enrich_dpo(fng_lookup, funding_lookup):
    """Enrich DPO dataset and return records."""
    if not os.path.exists(DPO_PATH):
        print(f"Skipping DPO: {DPO_PATH} not found")
        return [], Counter()

    records = []
    stats = Counter()

    with open(DPO_PATH) as f:
        for line in f:
            row = json.loads(line)
            stats["total"] += 1

            meta = row.get("metadata", {})
            ts_str = meta.get("created_at", "")
            token = meta.get("token", "")

            dt = parse_timestamp(ts_str)
            if not dt:
                stats["no_timestamp"] += 1
                records.append(row)  # keep unmodified
                continue

            date_str = dt.strftime("%Y-%m-%d")
            ts_unix = int(dt.timestamp())

            # Look up Fear & Greed
            fng = fng_lookup.get(date_str)
            if fng:
                stats["fng_matched"] += 1

            # Look up funding rate — prefer the token's rate, fall back to BTC
            funding = None
            if token in funding_lookup:
                funding = find_closest_funding(funding_lookup[token], ts_unix)
            if not funding and "BTC" in funding_lookup:
                funding = find_closest_funding(funding_lookup["BTC"], ts_unix)
            if funding:
                stats["funding_matched"] += 1

            sentiment_line = build_sentiment_line(fng, funding, token)

            if sentiment_line:
                stats["enriched"] += 1
                row["prompt"] = inject_sentiment_into_prompt(
                    row.get("prompt", ""), sentiment_line
                )
            else:
                stats["no_sentiment_data"] += 1

            records.append(row)

    return records, stats


def build_battle_id_lookup():
    """Build battle_id -> created_at lookup from DPO dataset (which has timestamps)."""
    lookup = {}
    if not os.path.exists(DPO_PATH):
        return lookup
    with open(DPO_PATH) as f:
        for line in f:
            row = json.loads(line)
            meta = row.get("metadata", {})
            bid = meta.get("battle_id", "")
            ts = meta.get("created_at", "")
            if bid and ts:
                lookup[bid] = ts
    return lookup


def enrich_sft(fng_lookup, funding_lookup):
    """Enrich SFT dataset and return records."""
    if not os.path.exists(SFT_PATH):
        print(f"Skipping SFT: {SFT_PATH} not found")
        return [], Counter()

    # Build battle_id -> timestamp lookup from DPO data
    battle_ts_lookup = build_battle_id_lookup()
    print(f"  Built battle_id lookup: {len(battle_ts_lookup)} entries")

    records = []
    stats = Counter()

    with open(SFT_PATH) as f:
        for line in f:
            row = json.loads(line)
            stats["total"] += 1

            meta = row.get("metadata", {})
            token = meta.get("token", "")

            # SFT format: messages[1].content is the user prompt
            messages = row.get("messages", [])
            user_msg = None
            user_idx = None
            for i, msg in enumerate(messages):
                if msg.get("role") == "user":
                    user_msg = msg
                    user_idx = i
                    break

            if not user_msg:
                stats["no_user_msg"] += 1
                records.append(row)
                continue

            # Try to extract timestamp from metadata
            ts_str = meta.get("created_at", "")

            # Cross-reference by battle_id with DPO dataset
            if not ts_str:
                bid = meta.get("battle_id", "")
                ts_str = battle_ts_lookup.get(bid, "")

            # Last resort: look for timestamps in prompt content
            if not ts_str:
                import re
                content = user_msg.get("content", "")
                ts_match = re.search(
                    r"(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})", content
                )
                if ts_match:
                    ts_str = ts_match.group(1)

            dt = parse_timestamp(ts_str)
            if not dt:
                stats["no_timestamp"] += 1
                records.append(row)
                continue

            date_str = dt.strftime("%Y-%m-%d")
            ts_unix = int(dt.timestamp())

            # Look up Fear & Greed
            fng = fng_lookup.get(date_str)
            if fng:
                stats["fng_matched"] += 1

            # Look up funding rate
            funding = None
            if token in funding_lookup:
                funding = find_closest_funding(funding_lookup[token], ts_unix)
            if not funding and "BTC" in funding_lookup:
                funding = find_closest_funding(funding_lookup["BTC"], ts_unix)
            if funding:
                stats["funding_matched"] += 1

            sentiment_line = build_sentiment_line(fng, funding, token)

            if sentiment_line:
                stats["enriched"] += 1
                row["messages"][user_idx]["content"] = inject_sentiment_into_prompt(
                    user_msg["content"], sentiment_line
                )
            else:
                stats["no_sentiment_data"] += 1

            records.append(row)

    return records, stats


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Enrich training data with sentiment signals")
    parser.add_argument("--sample", type=int, default=3, help="Number of sample records to print")
    parser.add_argument("--split", type=float, default=0.9, help="Train/val split ratio")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for shuffle")
    args = parser.parse_args()

    print("=" * 60)
    print("GemBots Sentiment Enrichment Pipeline")
    print("=" * 60)

    # Load sentiment data
    fng_lookup = load_fng_index()
    funding_lookup = load_funding_rates()

    if not fng_lookup and not funding_lookup:
        print("\nNo sentiment data available. Run the fetchers first:")
        print("  python3 scripts/fetch-fear-greed.py")
        print("  python3 scripts/fetch-funding-rates.py")
        sys.exit(1)

    # Enrich DPO dataset
    print(f"\nEnriching DPO dataset ({DPO_PATH})...")
    dpo_records, dpo_stats = enrich_dpo(fng_lookup, funding_lookup)

    # Enrich SFT dataset
    print(f"\nEnriching SFT dataset ({SFT_PATH})...")
    sft_records, sft_stats = enrich_sft(fng_lookup, funding_lookup)

    # Combine all records
    all_records = []
    for r in dpo_records:
        r["_source"] = "dpo"
        all_records.append(r)
    for r in sft_records:
        r["_source"] = "sft"
        all_records.append(r)

    print(f"\nTotal records: {len(all_records)}")

    # Shuffle and split
    random.seed(args.seed)
    random.shuffle(all_records)

    split_idx = int(len(all_records) * args.split)
    train = all_records[:split_idx]
    val = all_records[split_idx:]

    # Write output
    os.makedirs(DATA_DIR, exist_ok=True)

    def write_jsonl(path, records):
        with open(path, "w") as f:
            for r in records:
                # Remove internal _source tag from output
                out = {k: v for k, v in r.items() if k != "_source"}
                f.write(json.dumps(out, ensure_ascii=False) + "\n")

    write_jsonl(OUT_TRAIN, train)
    write_jsonl(OUT_VAL, val)

    train_mb = os.path.getsize(OUT_TRAIN) / 1024 / 1024
    val_mb = os.path.getsize(OUT_VAL) / 1024 / 1024

    # Combined stats
    total_stats = Counter()
    total_stats.update(dpo_stats)
    total_stats.update(sft_stats)

    # Print results
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"\nOutput files:")
    print(f"  Train: {OUT_TRAIN} ({len(train):,} records, {train_mb:.1f} MB)")
    print(f"  Val:   {OUT_VAL} ({len(val):,} records, {val_mb:.1f} MB)")

    print(f"\n--- DPO Dataset Stats ---")
    print(f"  Total records:       {dpo_stats['total']:,}")
    print(f"  Enriched:            {dpo_stats['enriched']:,}")
    print(f"  F&G matched:         {dpo_stats['fng_matched']:,}")
    print(f"  Funding matched:     {dpo_stats['funding_matched']:,}")
    print(f"  No timestamp:        {dpo_stats['no_timestamp']:,}")
    print(f"  No sentiment data:   {dpo_stats['no_sentiment_data']:,}")
    if dpo_stats["total"] > 0:
        pct = dpo_stats["enriched"] / dpo_stats["total"] * 100
        print(f"  Coverage:            {pct:.1f}%")

    print(f"\n--- SFT Dataset Stats ---")
    print(f"  Total records:       {sft_stats['total']:,}")
    print(f"  Enriched:            {sft_stats['enriched']:,}")
    print(f"  F&G matched:         {sft_stats['fng_matched']:,}")
    print(f"  Funding matched:     {sft_stats['funding_matched']:,}")
    print(f"  No timestamp:        {sft_stats['no_timestamp']:,}")
    print(f"  No sentiment data:   {sft_stats['no_sentiment_data']:,}")
    if sft_stats["total"] > 0:
        pct = sft_stats["enriched"] / sft_stats["total"] * 100
        print(f"  Coverage:            {pct:.1f}%")

    print(f"\n--- Combined ---")
    print(f"  Total:               {total_stats['total']:,}")
    print(f"  Enriched:            {total_stats['enriched']:,}")
    if total_stats["total"] > 0:
        pct = total_stats["enriched"] / total_stats["total"] * 100
        print(f"  Overall coverage:    {pct:.1f}%")

    # Print samples
    if args.sample > 0:
        print(f"\n{'=' * 60}")
        print(f"SAMPLE ENRICHED RECORDS ({args.sample})")
        print(f"{'=' * 60}")

        # Get enriched records
        enriched = [r for r in all_records if r["_source"] == "dpo"][:args.sample]
        if len(enriched) < args.sample:
            enriched += [r for r in all_records if r["_source"] == "sft"][
                : args.sample - len(enriched)
            ]

        for i, r in enumerate(enriched):
            print(f"\n--- Sample {i + 1} ({r['_source'].upper()}) ---")
            if r["_source"] == "dpo":
                prompt = r.get("prompt", "")
                print(f"PROMPT:\n{prompt[:500]}")
                print(f"\nCHOSEN: {r.get('chosen', '')[:200]}")
            else:
                messages = r.get("messages", [])
                for msg in messages[:2]:
                    role = msg.get("role", "?").upper()
                    content = msg.get("content", "")[:300]
                    print(f"{role}: {content}")
            print()


if __name__ == "__main__":
    main()
