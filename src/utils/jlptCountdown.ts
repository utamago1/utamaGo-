export type JlptExamSessionPreference = 'auto' | 'july' | 'december';
export type JlptExamSession = 'july' | 'december';

export interface JlptCountdownInfo {
  session: JlptExamSession;
  sessionLabel: string;
  year: number;
  examDate: Date;
  formattedDateId: string;
  daysRemaining: number;
  weeksRemaining: number;
  isExamDay: boolean;
  estimatedTotalHours: number;
}

const INDONESIAN_MONTHS: Readonly<Record<JlptExamSession, string>> = {
  july: 'Juli',
  december: 'Desember',
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns the first Sunday of the given month (0-indexed: 6 = July, 11 = December)
 * at local midnight (00:00:00). Official JLPT exams are held on the first Sunday
 * of July and the first Sunday of December every year.
 */
export function getFirstSundayOfMonth(year: number, monthIndex: number): Date {
  const firstDay = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const dayOfWeek = firstDay.getDay(); // 0 = Sunday
  const offsetToSunday = (7 - dayOfWeek) % 7;
  return new Date(year, monthIndex, 1 + offsetToSunday, 0, 0, 0, 0);
}

function toLocalStartOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function diffCalendarDays(fromDate: Date, toDate: Date): number {
  const utcFrom = Date.UTC(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate(),
  );
  const utcTo = Date.UTC(
    toDate.getFullYear(),
    toDate.getMonth(),
    toDate.getDate(),
  );
  return Math.round((utcTo - utcFrom) / MS_PER_DAY);
}

export function isValidJlptExamSession(
  value: unknown,
): value is JlptExamSessionPreference {
  return value === 'auto' || value === 'july' || value === 'december';
}

export function resolveNextJlptExam(
  preference: JlptExamSessionPreference = 'auto',
  dailyMinutes = 20,
  now: Date = new Date(),
): JlptCountdownInfo {
  const today = toLocalStartOfDay(now);
  const currentYear = today.getFullYear();

  const julyThisYear = getFirstSundayOfMonth(currentYear, 6);
  const decemberThisYear = getFirstSundayOfMonth(currentYear, 11);
  const julyNextYear = getFirstSundayOfMonth(currentYear + 1, 6);
  const decemberNextYear = getFirstSundayOfMonth(currentYear + 1, 11);

  let chosenSession: JlptExamSession;
  let examDate: Date;

  if (preference === 'july') {
    chosenSession = 'july';
    examDate =
      diffCalendarDays(today, julyThisYear) >= 0 ? julyThisYear : julyNextYear;
  } else if (preference === 'december') {
    chosenSession = 'december';
    examDate =
      diffCalendarDays(today, decemberThisYear) >= 0
        ? decemberThisYear
        : decemberNextYear;
  } else {
    if (diffCalendarDays(today, julyThisYear) >= 0) {
      chosenSession = 'july';
      examDate = julyThisYear;
    } else if (diffCalendarDays(today, decemberThisYear) >= 0) {
      chosenSession = 'december';
      examDate = decemberThisYear;
    } else {
      chosenSession = 'july';
      examDate = julyNextYear;
    }
  }

  const daysRemaining = Math.max(0, diffCalendarDays(today, examDate));
  const weeksRemaining = Math.floor(daysRemaining / 7);
  const safeDailyMinutes = Math.max(5, Math.min(240, Math.round(dailyMinutes)));
  const estimatedTotalHours = Math.round(
    (daysRemaining * safeDailyMinutes) / 60,
  );
  const monthName = INDONESIAN_MONTHS[chosenSession];
  const examYear = examDate.getFullYear();

  return {
    session: chosenSession,
    sessionLabel: `JLPT ${monthName} ${examYear}`,
    year: examYear,
    examDate,
    formattedDateId: `Minggu, ${examDate.getDate()} ${monthName} ${examYear}`,
    daysRemaining,
    weeksRemaining,
    isExamDay: daysRemaining === 0,
    estimatedTotalHours,
  };
}
