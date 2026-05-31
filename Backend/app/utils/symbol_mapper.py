INDEX_SYMBOL_MAP = {
    "NIFTY 50": "^NSEI",
    "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "NIFTY BANK": "^NSEBANK",
    "FINNIFTY": "NIFTY_FIN_SERVICE.NS",
    "NIFTY NEXT 50": "^NSMIDCP",
    "SENSEX": "^BSESN",
}

SYMBOL_ALIAS_MAP = {
    "ZOMATO": "ETERNAL",
    "ZOMATO LTD": "ETERNAL",
    "ZOMATO LIMITED": "ETERNAL",
    "ETERNAL": "ETERNAL",
}


def normalize_symbol(symbol: str) -> str:
    value = symbol.strip().upper()
    value = SYMBOL_ALIAS_MAP.get(value, value)
    if value in INDEX_SYMBOL_MAP:
        return INDEX_SYMBOL_MAP[value]
    if value.startswith("^") or value.endswith(".NS"):
        return value
    return f"{value}.NS"
