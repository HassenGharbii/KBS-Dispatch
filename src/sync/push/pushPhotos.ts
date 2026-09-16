import { File } from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import {
  listPendingPhotosForSyncedEvents,
  markPhotosUploading,
  markPhotoUploaded,
  markPhotoSyncError,
} from '../../db/repositories/photosRepo';
import { getEventById } from '../../db/repositories/eventsRepo';
import { computeNextRetryAt } from '../backoff';
import type { Photo } from '../../types/domain';

const CONCURRENCY = 3;

async function uploadOne(photo: Photo): Promise<void> {
  if (!photo.localUri) {
    await markPhotoSyncError(photo.id, 'Missing local file', computeNextRetryAt(photo.syncAttempts));
    return;
  }

  await markPhotosUploading([photo.id]);

  try {
    const event = await getEventById(photo.eventId);
    if (!event) throw new Error('Parent event not found locally');

    const path = `${photo.agentId}/${event.shiftId}/${photo.eventId}/${photo.id}.jpg`;
    const bytes = await new File(photo.localUri).bytes();

    const { error: uploadError } = await supabase.storage
      .from('shift-photos')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;

    const { error: metaError } = await supabase.from('photos').upsert(
      {
        id: photo.id,
        event_id: photo.eventId,
        agent_id: photo.agentId,
        storage_path: path,
        taken_at: photo.takenAt,
        width: photo.width,
        height: photo.height,
        file_size_bytes: photo.fileSizeBytes,
      },
      { onConflict: 'id' }
    );
    if (metaError) throw metaError;

    await markPhotoUploaded(photo.id, path);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markPhotoSyncError(photo.id, message, computeNextRetryAt(photo.syncAttempts));
  }
}

export async function pushPhotos(): Promise<void> {
  const photos = await listPendingPhotosForSyncedEvents();
  if (photos.length === 0) return;

  // Bounded concurrency: protects weak connections / entry-level devices
  // from having the whole backlog uploaded at once.
  for (let i = 0; i < photos.length; i += CONCURRENCY) {
    const batch = photos.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(uploadOne));
  }
}
