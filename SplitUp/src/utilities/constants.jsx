export const CURRENCIES = [
    "SGD", "MYR", "JPY", "USD", "EUR", "GBP", "HKD", "AUD", "NZD", "CHF", "SEK", "THB"
];

export const IGNORE_KEYWORDS = [
    "TOTAL", "SUBTOTAL", "GST", "SERVICE", "SVC", 
    "INVOICE", "TABLE", "DINERS", "CASH", "CHANGE", 
    "ROUNDING", "SAVINGS", "DESCRIPTION", "RATE", 
    "THANK YOU", "RECEIPT", "TAX", "DISCOUNT", "CARD", 
    "UEN", "TEL", "FAX", "REG NO", "GUEST", 
    "AMOUNT", "AMT", "AMNT"
];

export const PRICE_PATTERNS = [
    /(\d{1,4}\.\d{1,2})\s*$/,           // Price at end: "ITEM 12.50"
    /^\s*(\d{1,4}\.\d{1,2})/,           // Price at start: "12.50 ITEM"
    /\s+(\d{1,4}\.\d{1,2})(?:\s|$)/,    // Price with spaces
    /[^\d](\d{1,4}\.\d{1,2})[^\d]/,     // Price surrounded by non-digits
];