function escapeCsvField(field) {
    const value = field == null ? '' : `${field}`;
    if (/[",\r\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

// A spreadsheet runs a cell that starts with = + - @ (or tab / carriage return) as a formula, so a
// list name or description written by someone else could act when the file is opened. A leading
// apostrophe makes the cell plain text.
function neutralizeFormula(field) {
    const value = field == null ? '' : `${field}`;
    return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

// For free-text columns. Numeric columns are left alone so a negative number stays a number.
function escapeCsvText(field) {
    return escapeCsvField(neutralizeFormula(field));
}

// For numeric columns: a real number is kept as is (a negative one included), anything else is text.
function escapeCsvNumber(field) {
    const value = field == null ? '' : `${field}`;
    return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(value) ? escapeCsvField(value) : escapeCsvText(value);
}

// The "# List description:" line is read back as one raw line, so it is not quoted. A comma in it
// would start a new cell, so a space goes in front of any cell that would start like a formula.
function safeCommentLine(text) {
    return `${text}`.replace(/,[ \t]*(?=[=+\-@])/g, ', ');
}

module.exports = {
    escapeCsvField,
    neutralizeFormula,
    escapeCsvText,
    escapeCsvNumber,
    safeCommentLine,
};
