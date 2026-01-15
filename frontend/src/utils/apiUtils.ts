export const formatApiErrors = (txt: string) => {
    try {
        const data = JSON.parse(txt);
        if (typeof data === "string") return data;
        if (data.detail) return data.detail;
        if (typeof data === "object") {
            const msgs: string[] = [];
            for (const key of Object.keys(data)) {
                const val = data[key];
                if (Array.isArray(val)) {
                    msgs.push(`${key}: ${val.join(", ")}`);
                } else if (typeof val === "string") {
                    msgs.push(`${key}: ${val}`);
                } else {
                    msgs.push(`${key}: ${JSON.stringify(val)}`);
                }
            }
            return msgs.join(" | ");
        }
        return txt;
    } catch {
        return txt;
    }
};
