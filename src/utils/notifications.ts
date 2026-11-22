import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type NotificationPermissionState =
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported';

export interface DailyReminderConfig {
  enabled: boolean;
  hour: number;
  minute: number;
  lastNotifiedDate: string | null;
}

export interface LocalNotificationAdapter {
  isSupported(): boolean;
  getPermissionStatus(): Promise<NotificationPermissionState>;
  requestPermission(): Promise<NotificationPermissionState>;
  sendImmediateNotification(title: string, body: string): Promise<boolean>;
  scheduleDailyReminder(config: DailyReminderConfig): Promise<void>;
  cancelDailyReminder(): Promise<void>;
}

const DAILY_REMINDER_ID = 1001;
const TEST_NOTIFICATION_ID = 1002;
const REMINDER_CHANNEL_ID = 'utamago-daily-reminder';

function mapCapacitorPermission(display: string): NotificationPermissionState {
  if (display === 'granted') return 'granted';
  if (display === 'denied') return 'denied';
  return 'default';
}

class CapacitorNotificationAdapter implements LocalNotificationAdapter {
  private channelCreated = false;

  isSupported(): boolean {
    return true;
  }

  private async ensureChannel(): Promise<void> {
    if (this.channelCreated) return;
    try {
      await LocalNotifications.createChannel({
        id: REMINDER_CHANNEL_ID,
        name: 'Pengingat Belajar JLPT',
        description: 'Notifikasi harian pengingat latihan UtamaGo!',
        importance: 4,
      });
      this.channelCreated = true;
    } catch {
      // Channel creation unsupported or already registered
    }
  }

  async getPermissionStatus(): Promise<NotificationPermissionState> {
    try {
      const status = await LocalNotifications.checkPermissions();
      return mapCapacitorPermission(status.display);
    } catch {
      return 'unsupported';
    }
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    try {
      const status = await LocalNotifications.requestPermissions();
      return mapCapacitorPermission(status.display);
    } catch {
      return 'denied';
    }
  }

  async sendImmediateNotification(title: string, body: string): Promise<boolean> {
    try {
      await this.ensureChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: TEST_NOTIFICATION_ID,
            title,
            body,
            channelId: REMINDER_CHANNEL_ID,
            schedule: { at: new Date(Date.now() + 800) },
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  async scheduleDailyReminder(config: DailyReminderConfig): Promise<void> {
    try {
      await this.ensureChannel();
      await LocalNotifications.cancel({
        notifications: [{ id: DAILY_REMINDER_ID }],
      });
      if (!config.enabled) return;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: DAILY_REMINDER_ID,
            title: 'Saatnya Belajar JLPT di UtamaGo!',
            body: 'Jaga streak harianmu dengan kartu Anki atau latihan soal sekarang.',
            channelId: REMINDER_CHANNEL_ID,
            schedule: {
              on: {
                hour: config.hour,
                minute: config.minute,
              },
              repeats: true,
              allowWhileIdle: true,
            },
          },
        ],
      });
    } catch {
      // Ignore scheduling failures if permission denied on OS
    }
  }

  async cancelDailyReminder(): Promise<void> {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: DAILY_REMINDER_ID }],
      });
    } catch {
      // Ignore cancellation errors
    }
  }
}

class WebNotificationAdapter implements LocalNotificationAdapter {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  async getPermissionStatus(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) return 'unsupported';
    return window.Notification.permission;
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) return 'unsupported';
    try {
      return await window.Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  async sendImmediateNotification(title: string, body: string): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (window.Notification.permission !== 'granted') return false;
    try {
      new window.Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'utamago-daily-reminder',
      });
      return true;
    } catch {
      return false;
    }
  }

  async scheduleDailyReminder(_config: DailyReminderConfig): Promise<void> {
    // Web browsers evaluate reminder schedule while tab is active.
  }

  async cancelDailyReminder(): Promise<void> {
    // No persistent OS alarm in standard Web Notification API.
  }
}

function createPlatformNotificationAdapter(): LocalNotificationAdapter {
  try {
    if (Capacitor.isNativePlatform()) {
      return new CapacitorNotificationAdapter();
    }
  } catch {
    // Fallback to Web adapter in Node/browser environments
  }
  return new WebNotificationAdapter();
}

let activeAdapter: LocalNotificationAdapter = createPlatformNotificationAdapter();

export function setNotificationAdapter(adapter: LocalNotificationAdapter): void {
  activeAdapter = adapter;
}

export function getNotificationAdapter(): LocalNotificationAdapter {
  return activeAdapter;
}

export function shouldFireReminderNow(
  config: DailyReminderConfig,
  now: Date,
  todayKey: string,
): boolean {
  if (!config.enabled) return false;
  if (config.lastNotifiedDate === todayKey) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = config.hour * 60 + config.minute;
  return currentMinutes >= targetMinutes;
}

export function formatReminderTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
