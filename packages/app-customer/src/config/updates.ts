/**
 * URLs públicas para verificação de atualização do app (APK sideload).
 */
export const UPDATE_MANIFEST_URL =
    process.env.EXPO_PUBLIC_UPDATE_MANIFEST_URL ?? 'https://dunnaa.com.br/app/version.json';

export interface AppUpdateManifest {
    version: string;
    versionCode: number;
    apkUrl: string;
    releaseNotes?: string;
    mandatory?: boolean;
    publishedAt?: string;
}
