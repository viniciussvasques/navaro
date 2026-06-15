"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const APP_STORE_URL = "https://apps.apple.com/app/dunnaa/id000000000";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=br.com.dunnaa";
const APK_DOWNLOAD_URL = "/downloads/dunnaa-cliente.apk";
const IOS_PWA_INSTALL_URL = "/instalar/ios";

type Props = {
  className?: string;
  /** App Store ainda não publicada — usa PWA na Tela de Início */
  iosAvailable?: boolean;
  /** Google Play ainda não publicada — usa APK direto quando false */
  androidAvailable?: boolean;
};

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export default function StoreBadges({
  className = "",
  iosAvailable = false,
  androidAvailable = false,
}: Props) {
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(isIosDevice());
  }, []);

  const androidHref = androidAvailable ? PLAY_STORE_URL : APK_DOWNLOAD_URL;
  const iosHref = iosAvailable ? APP_STORE_URL : IOS_PWA_INSTALL_URL;

  return (
    <div className={"flex flex-wrap items-center justify-center gap-4 " + className}>
      {iosAvailable ? (
        <a
          href={iosHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex transition hover:scale-105 hover:opacity-90"
          aria-label="Download na App Store"
        >
          <Image
            src="/store/logoaplee.svg"
            alt="Download on the App Store"
            width={230}
            height={82}
            className="h-[72px] w-auto"
            priority
          />
        </a>
      ) : (
        <Link
          href={iosHref}
          className="flex transition hover:scale-105 hover:opacity-90"
          aria-label="Instalar DUNNAA no iPhone"
          title="Instalar na Tela de Início (iPhone)"
        >
          <Image
            src="/store/logoaplee.svg"
            alt="Instalar no iPhone"
            width={230}
            height={82}
            className="h-[72px] w-auto"
            priority
          />
        </Link>
      )}

      <a
        href={androidHref}
        download={!androidAvailable}
        target={androidAvailable ? "_blank" : undefined}
        rel={androidAvailable ? "noopener noreferrer" : undefined}
        className="flex transition hover:scale-105 hover:opacity-90"
        aria-label={androidAvailable ? "Disponível no Google Play" : "Baixar APK Android"}
      >
        <Image
          src="/store/google-play-badge-official.png"
          alt="Get it on Google Play"
          width={260}
          height={90}
          className="h-[68px] w-auto"
          priority
        />
      </a>

      {!iosAvailable && !androidAvailable && (
        <p className="w-full text-center text-sm text-slate-500">
          {ios
            ? "Toque na App Store para instalar na Tela de Início do iPhone."
            : "Android: APK direto. iPhone: toque na App Store para instalar o app."}
        </p>
      )}
    </div>
  );
}
