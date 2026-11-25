import { useCallback, useRef } from 'react';
import {
  BookOpen,
  ClipboardCheck,
  Home,
  Layers,
  Mail,
  Moon,
  Settings,
  Star,
  Sun,
  User,
  WifiOff,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BRAND_ASSETS } from '../data/utamagoContent';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useLanguage } from '../i18n/LanguageContext';
import { vibrateTap } from '../utils/haptics';
import type { LevelProgressInfo } from '../utils/levelProgression';
import type { StoredAppTab } from '../utils/storage';

export type AppTab = StoredAppTab | 'messages';

interface AppShellNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  levelProgress: LevelProgressInfo;
  totalStars: number;
  maxStars: number;
  totalDeckCards: number;
  dueAnkiCount: number;
  isDark: boolean;
  onToggleDarkLight: () => void;
  onOpenSettings: () => void;
  onLogoSecretTrigger?: () => void;
  adminUnlocked?: boolean;
  unreadMessagesCount?: number;
}

interface TabItemMeta {
  id: AppTab;
  shortLabelId: string;
  shortLabelEn: string;
  titleId: string;
  titleEn: string;
  icon: typeof Home;
}

const BASE_TAB_ITEMS: TabItemMeta[] = [
  {
    id: 'home',
    shortLabelId: 'Beranda',
    shortLabelEn: 'Home',
    titleId: 'Beranda',
    titleEn: 'Home',
    icon: Home,
  },
  {
    id: 'anki',
    shortLabelId: 'Anki',
    shortLabelEn: 'Anki',
    titleId: 'Anki',
    titleEn: 'Anki',
    icon: Layers,
  },
  {
    id: 'learn',
    shortLabelId: 'Materi',
    shortLabelEn: 'Study',
    titleId: 'Materi',
    titleEn: 'Study',
    icon: BookOpen,
  },
  {
    id: 'tryout',
    shortLabelId: 'Tryout',
    shortLabelEn: 'Tryout',
    titleId: 'Tryout',
    titleEn: 'Tryout',
    icon: ClipboardCheck,
  },
  {
    id: 'profile',
    shortLabelId: 'Profil',
    shortLabelEn: 'Profile',
    titleId: 'Profil',
    titleEn: 'Profile',
    icon: User,
  },
];

const ADMIN_MESSAGES_TAB: TabItemMeta = {
  id: 'messages',
  shortLabelId: 'Pesan',
  shortLabelEn: 'Inbox',
  titleId: 'Pesan',
  titleEn: 'Inbox',
  icon: Mail,
};

function useTripleTapTrigger(onTrigger?: () => void) {
  const tapTimestampsRef = useRef<number[]>([]);

  return useCallback(() => {
    if (!onTrigger) return;
    const now = Date.now();
    const recent = tapTimestampsRef.current.filter((ts) => now - ts <= 1500);
    recent.push(now);
    if (recent.length >= 3) {
      tapTimestampsRef.current = [];
      onTrigger();
    } else {
      tapTimestampsRef.current = recent;
    }
  }, [onTrigger]);
}

export function MobileTopAppBar({
  activeTab,
  isDark,
  onToggleDarkLight,
  onOpenSettings,
  onLogoSecretTrigger,
}: Pick<
  AppShellNavProps,
  | 'activeTab'
  | 'levelProgress'
  | 'isDark'
  | 'onToggleDarkLight'
  | 'onOpenSettings'
  | 'onLogoSecretTrigger'
>) {
  const isOnline = useOnlineStatus();
  const { t } = useLanguage();
  const handleLogoTap = useTripleTapTrigger(onLogoSecretTrigger);
  const allTabs = [...BASE_TAB_ITEMS, ADMIN_MESSAGES_TAB];
  const activeMeta =
    allTabs.find((item) => item.id === activeTab) ?? BASE_TAB_ITEMS[0];

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface/95 pt-safe pl-safe pr-safe backdrop-blur-md lg:hidden">
      <div className="flex h-13 items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={handleLogoTap}
            aria-label="UtamaGo!"
            className="flex h-8 w-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-[#f6f5f0] p-0.5 focus:outline-none dark:border-white/15 dark:bg-[#eae7df]"
          >
            <img
              src={BRAND_ASSETS.logoPath}
              alt="Logo UtamaGo!"
              referrerPolicy="no-referrer"
              draggable={false}
              className="h-full w-full object-contain mix-blend-multiply"
            />
          </button>
          <h1 className="truncate font-display text-base font-extrabold tracking-tight text-on-surface">
            {activeTab === 'home'
              ? 'UtamaGo!'
              : t(activeMeta.titleId, activeMeta.titleEn)}
          </h1>
          <span className="shrink-0 rounded-md border border-primary/35 bg-primary-container/60 px-1.5 py-0.5 font-mono text-[10px] leading-none font-bold tracking-wider uppercase text-on-primary-container">
            Beta
          </span>
          {!isOnline && (
            <span
              className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-warning"
              title={t('Mode offline', 'Offline mode')}
            >
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden min-[390px]:inline">Offline</span>
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onToggleDarkLight();
            }}
            aria-label={
              isDark
                ? t('Aktifkan Mode Terang', 'Switch to Light Mode')
                : t('Aktifkan Mode Malam', 'Switch to Dark Mode')
            }
            title={
              isDark
                ? t('Mode Terang', 'Light Mode')
                : t('Mode Malam', 'Dark Mode')
            }
            className="m3-tactile inline-flex h-11 w-11 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            {isDark ? (
              <Sun className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Moon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onOpenSettings();
            }}
            aria-label={t('Buka Pengaturan', 'Open Settings')}
            title={t('Pengaturan', 'Settings')}
            className="m3-tactile inline-flex h-11 w-11 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav({
  activeTab,
  dueAnkiCount,
  onSelectTab,
  adminUnlocked = false,
  unreadMessagesCount = 0,
}: Pick<
  AppShellNavProps,
  | 'activeTab'
  | 'dueAnkiCount'
  | 'onSelectTab'
  | 'adminUnlocked'
  | 'unreadMessagesCount'
>) {
  const { t } = useLanguage();
  const visibleTabs = adminUnlocked
    ? [...BASE_TAB_ITEMS, ADMIN_MESSAGES_TAB]
    : BASE_TAB_ITEMS;

  return (
    <nav
      aria-label={t('Navigasi Utama Aplikasi', 'Main App Navigation')}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant bg-surface-container-low/95 pb-safe pl-safe pr-safe backdrop-blur-md lg:hidden"
    >
      <div
        className={`grid h-14 items-stretch px-1 ${
          adminUnlocked ? 'grid-cols-6' : 'grid-cols-5'
        }`}
      >
        {visibleTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const title = t(item.titleId, item.titleEn);
          const shortLabel = t(item.shortLabelId, item.shortLabelEn);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                vibrateTap();
                onSelectTab(item.id);
              }}
              aria-current={isActive ? 'page' : undefined}
              aria-label={
                item.id === 'anki' && dueAnkiCount > 0
                  ? `${title} (${dueAnkiCount} ${t('kartu jatuh tempo', 'due cards')})`
                  : item.id === 'messages' && unreadMessagesCount > 0
                    ? `${title} (${unreadMessagesCount} ${t('pesan baru', 'open reports')})`
                    : title
              }
              className={`m3-tactile relative flex h-full min-h-[48px] flex-col items-center justify-center gap-1 ${
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="m3-bottom-nav-indicator"
                  transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                />
              )}
              <span className="relative flex h-5 w-8 items-center justify-center">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.id === 'anki' && dueAnkiCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-2 font-mono text-[9px] leading-none font-bold tabular-nums text-primary"
                  >
                    {dueAnkiCount > 99 ? '99+' : dueAnkiCount}
                  </span>
                )}
                {item.id === 'messages' && unreadMessagesCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] leading-[15px] font-bold tabular-nums text-on-primary"
                  >
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </span>
              <span
                className={`whitespace-nowrap text-[11px] leading-none tracking-tight ${
                  isActive
                    ? 'font-bold text-on-surface'
                    : 'font-medium text-on-surface-variant'
                }`}
              >
                {shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function DesktopNavigationRail({
  activeTab,
  onSelectTab,
  levelProgress,
  totalStars,
  maxStars,
  totalDeckCards,
  dueAnkiCount,
  isDark,
  onToggleDarkLight,
  onOpenSettings,
  onLogoSecretTrigger,
  adminUnlocked = false,
  unreadMessagesCount = 0,
}: AppShellNavProps) {
  const isOnline = useOnlineStatus();
  const { t } = useLanguage();
  const handleLogoTap = useTripleTapTrigger(onLogoSecretTrigger);
  const visibleTabs = adminUnlocked
    ? [...BASE_TAB_ITEMS, ADMIN_MESSAGES_TAB]
    : BASE_TAB_ITEMS;

  return (
    <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:justify-between lg:border-r lg:border-outline-variant lg:bg-surface-container-low lg:p-5">
      <div>
        <div className="flex items-center justify-between gap-1.5 border-b border-outline-variant pb-4">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button
              type="button"
              onClick={handleLogoTap}
              aria-label="UtamaGo!"
              className="flex h-9 w-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-[#f6f5f0] p-0.5 focus:outline-none dark:border-white/15 dark:bg-[#eae7df]"
            >
              <img
                src={BRAND_ASSETS.logoPath}
                alt="Logo UtamaGo!"
                referrerPolicy="no-referrer"
                draggable={false}
                className="h-full w-full object-contain mix-blend-multiply"
              />
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className="m3-tactile min-w-0 flex-1 rounded-xl px-1 py-1 text-left hover:bg-surface-container"
            >
              <div className="flex items-center gap-1.5">
                <p className="truncate font-display text-base font-extrabold tracking-tight text-on-surface">
                  Utama<span className="text-primary">Go!</span>
                </p>
                <span className="shrink-0 rounded-md border border-primary/35 bg-primary-container/60 px-1.5 py-0.5 font-mono text-[9px] leading-none font-bold tracking-wider uppercase text-on-primary-container">
                  Beta
                </span>
              </div>
              <p className="truncate text-[11px] font-medium text-on-surface-variant">
                Beta Tester · JLPT
              </p>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onToggleDarkLight();
              }}
              aria-label={
                isDark
                  ? t('Aktifkan Mode Terang', 'Switch to Light Mode')
                  : t('Aktifkan Mode Malam', 'Switch to Dark Mode')
              }
              title={
                isDark
                  ? t('Mode Terang', 'Light Mode')
                  : t('Mode Malam', 'Dark Mode')
              }
              className="m3-tactile inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            >
              {isDark ? (
                <Sun className="h-4.5 w-4.5" aria-hidden="true" />
              ) : (
                <Moon className="h-4.5 w-4.5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onOpenSettings();
              }}
              aria-label={t('Buka Pengaturan', 'Open Settings')}
              title={t('Pengaturan', 'Settings')}
              className="m3-tactile inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            >
              <Settings className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav
          aria-label={t('Menu Aplikasi', 'App Menu')}
          className="mt-5 space-y-1"
        >
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`m3-tactile flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary-container/70 font-bold text-on-primary-container'
                    : 'font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive
                        ? 'text-on-primary-container'
                        : 'text-on-surface-variant'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{t(item.titleId, item.titleEn)}</span>
                </span>
                {item.id === 'anki' && (
                  <span className="font-mono text-xs tabular-nums text-on-surface-variant">
                    {dueAnkiCount > 0 ? dueAnkiCount : totalDeckCards}
                  </span>
                )}
                {item.id === 'messages' && unreadMessagesCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-on-primary">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2.5 border-t border-outline-variant pt-4">
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-on-surface">
              Lv.{levelProgress.level} · {levelProgress.rank.stage}
            </span>
            <span className="inline-flex items-center gap-1 font-mono font-semibold tabular-nums text-on-surface-variant">
              <Star
                className="h-3.5 w-3.5 fill-amber-400 text-amber-500"
                aria-hidden="true"
              />
              {totalStars}/{maxStars}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${levelProgress.progressPercent}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between font-mono text-[11px] tabular-nums text-on-surface-variant">
            <span>{levelProgress.totalXp} XP</span>
            <span>
              {levelProgress.currentLevelXp}/{levelProgress.xpForNextLevel}
            </span>
          </div>
        </div>

        {!isOnline && (
          <div className="flex items-center gap-2 px-1 text-xs font-medium text-warning">
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t('Mode offline aktif', 'Offline mode active')}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
