import type { TryOutPacketPartId } from '../utils/tryOutPacket';
import type {
  ChoukaiTranscriptSection,
  ParsedVerifiedTryOutPacket,
} from '../utils/tryOutVerifiedParser';
import type { TryOutFormPage } from './tryOutN2Data';
import verifiedN1PacketsRaw from './tryOutN1VerifiedPackets.json';
import verifiedN2PacketsRaw from './tryOutN2VerifiedPackets.json';
import verifiedN3PacketsRaw from './tryOutN3VerifiedPackets.json';

const VERIFIED_PACKETS: Record<string, ParsedVerifiedTryOutPacket> = {
  ...(verifiedN3PacketsRaw as unknown as Record<
    string,
    ParsedVerifiedTryOutPacket
  >),
  ...(verifiedN2PacketsRaw as unknown as Record<
    string,
    ParsedVerifiedTryOutPacket
  >),
  ...(verifiedN1PacketsRaw as unknown as Record<
    string,
    ParsedVerifiedTryOutPacket
  >),
};

const EMPTY_FORMS: Record<TryOutPacketPartId, TryOutFormPage[]> = {
  'moji-bunpou': [],
  dokkai: [],
  choukai: [],
};

const N3_PARTITIONED_FORMS_CACHE = new Map<
  string,
  Record<TryOutPacketPartId, TryOutFormPage[]>
>();

function isN3BunpouPage(page: TryOutFormPage): boolean {
  return /-mb-page-[678]$/.test(page.id) || /文法|bunpou/i.test(page.title);
}

/**
 * Official JLPT N3 exam booklet & timing split:
 *   1. Moji-Goi (文字・語彙)       — 30 min (語彙 問題1–5 · 35 questions)
 *   2. Bunpou & Dokkai (文法・読解) — 70 min (文法 問題1–3 · 23q + 読解 問題4–7 · 16q = 39 questions)
 *   3. Choukai (聴解)              — 40 min (聴解 問題1–5 · 27–28 questions)
 *
 * Note: For scoring, JLPT N3 combines Moji-Goi (35 pts) + Bunpou (23 pts) = 58 pts -> /60,
 * Dokkai = 60 pts -> /60, and Choukai = 56 pts -> /60 (pass >= 95/180 and >= 19/60 each).
 */
function buildPartitionedN3Forms(
  packet: ParsedVerifiedTryOutPacket,
): Record<TryOutPacketPartId, TryOutFormPage[]> {
  const cached = N3_PARTITIONED_FORMS_CACHE.get(packet.packetId);
  if (cached) return cached;

  const rawMojiBunpou = packet.forms['moji-bunpou'] ?? [];
  const rawDokkai = packet.forms.dokkai ?? [];
  const rawChoukai = packet.forms.choukai ?? [];

  const mojiPages: TryOutFormPage[] = [];
  const bunpouPages: TryOutFormPage[] = [];

  const choukaiCount = rawChoukai.reduce(
    (sum, pg) => sum + pg.items.filter((it) => it.kind === 'choice').length,
    0,
  );

  for (const page of rawMojiBunpou) {
    if (isN3BunpouPage(page)) {
      bunpouPages.push(page);
    } else if (/-mb-page-0$/.test(page.id)) {
      mojiPages.push({
        ...page,
        items: page.items.map((item) =>
          item.kind === 'notice'
            ? {
                ...item,
                bullets: [
                  `Pembagian Sesi Resmi JLPT N3 (140 menit): Bagian 01 Moji-Goi (35 soal · 30 mnt), Bagian 02 Bunpou & Dokkai (23 + 16 = 39 soal · 70 mnt), dan Bagian 03 Choukai (${choukaiCount} soal · 40 mnt).`,
                  'Rumus Skor Resmi JLPT N3: Bahasa/言語知識 (Moji-Goi 35 + Bunpou 23 = 58 poin → ÷58×60), Dokkai (60 poin → ÷60×60), Choukai (56 poin → ÷56×60). Lulus jika total ≥ 95/180 dan tiap bagian ≥ 19/60.',
                  'Kunci Jawaban & Pembahasan: Skor otomatis, pembahasan soal salah, serta transkrip lengkap Choukai (聴力原文) terbuka otomatis setelah bagian dikumpulkan.',
                ],
              }
            : item,
        ),
      });
    } else {
      mojiPages.push(page);
    }
  }

  const partitioned: Record<TryOutPacketPartId, TryOutFormPage[]> = {
    'moji-bunpou': mojiPages,
    dokkai: [...bunpouPages, ...rawDokkai],
    choukai: rawChoukai,
  };

  N3_PARTITIONED_FORMS_CACHE.set(packet.packetId, partitioned);
  return partitioned;
}

export function getTryOutPacketForms(
  packetId: string,
): Record<TryOutPacketPartId, TryOutFormPage[]> {
  const verified = VERIFIED_PACKETS[packetId];
  if (verified) {
    if (packetId.startsWith('n3-')) {
      return buildPartitionedN3Forms(verified);
    }
    return verified.forms;
  }
  return EMPTY_FORMS;
}

export function getTryOutPacketChoukaiTranscript(
  packetId: string,
): ChoukaiTranscriptSection[] {
  return VERIFIED_PACKETS[packetId]?.choukaiTranscript ?? [];
}

export function getVerifiedTryOutPacketData(
  packetId: string,
): ParsedVerifiedTryOutPacket | null {
  return VERIFIED_PACKETS[packetId] ?? null;
}
