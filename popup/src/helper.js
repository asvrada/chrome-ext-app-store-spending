
/**
 * Add quotes to string if it includes certain char
 * @param s {string}
 * @returns {null|string}
 */
function addEscape(s) {
    if (!s) {
        return null;
    }

    // escape "
    s = s.replace(/"/g, '""');
    // replace unicode space
    s = s.replace(/\u00A0/g, " ");

    // Should quote?
    if (s.includes(" ") || s.includes(",")) {
        s = `"${s}"`;
    }

    return s;
}

/**
 * Generate CSV object given purchases
 * @param purchases {[{date: string, name: string, detail: string, type: string, amountPaid: {currency: string, amount: number}}]}
 * @returns {module:buffer.Blob}
 */
function generateCSV(purchases) {
    const header = "Date,Name,Detail,Type,Amount";
    const rows = purchases.map((each) => {
        // TODO: yyyy/mm/dd
        const date = each.date.split("T")[0];

        const name = addEscape(each.name);
        const detail = addEscape(each.detail);
        const type = addEscape(each.type);
        const currency = each.amountPaid.currency;
        const amount = each.amountPaid.amount;

        return `${date},${name},${detail},${type},${currency}${amount}`;
    });

    const content = `${header}\n${rows.join("\n")}`;

    return new Blob([content], {type: "text/csv"});
}

export {generateCSV};
