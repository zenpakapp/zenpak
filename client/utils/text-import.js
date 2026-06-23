function detectQty(name) {
    const m = name.match(/\(x\s*(\d+)\)|x(\d+)\s*$/i);
    return m ? parseInt(m[1] || m[2], 10) : 1;
}

function cleanName(name) {
    return name.replace(/\s*\(x\s*\d+\)\s*$/i, '').replace(/\s+x\d+\s*$/i, '').trim();
}

function parseTextList(input) {
    let category = 'General';
    const items = [];

    for (const raw of input.split('\n')) {
        const line = raw.trim();
        if (!line) continue;

        // Category header: -PACKING or -SLEEPING etc.
        if (/^-[A-Z]/.test(line)) {
            category = line.slice(1).trim();
            continue;
        }

        // Item line: *Name - URL or *Name
        if (line.startsWith('*')) {
            const content = line.slice(1).trim();
            const sepIdx = content.lastIndexOf(' - ');
            let name, url, desc;

            if (sepIdx > -1) {
                const left = content.slice(0, sepIdx).trim();
                const right = content.slice(sepIdx + 3).trim();
                name = left;
                if (right.startsWith('http')) {
                    url = right;
                    desc = '';
                } else {
                    url = '';
                    desc = right;
                }
            } else {
                name = content;
                url = '';
                desc = '';
            }

            const qty = detectQty(name);
            items.push({
                name: cleanName(name),
                category,
                description: desc,
                qty,
                weight: 0,
                unit: 'oz',
                url,
                price: 0,
                worn: false,
                consumable: false,
            });
        }
    }

    return items;
}

module.exports = { parseTextList };
