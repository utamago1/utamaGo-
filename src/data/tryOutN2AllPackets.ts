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

export function getTryOutPacketForms(
  packetId: string,
): Record<TryOutPacketPartId, TryOutFormPage[]> {
  const verified = VERIFIED_PACKETS[packetId];
  if (verified) {
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
