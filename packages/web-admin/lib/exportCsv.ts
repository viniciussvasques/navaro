import { api } from "./api";

/** Download admin CSV export (opens blob in browser). */
export async function downloadAdminCsv(path: string, fallbackName: string) {
    const res = await api.get(path, { responseType: "blob" });
    const disposition = res.headers["content-disposition"] as string | undefined;
    const match = disposition?.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || fallbackName;
    const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
