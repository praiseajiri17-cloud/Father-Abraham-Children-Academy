import { useCallback, useEffect, useState } from 'react';
import { createPublicSupabaseClient } from '../lib/supabase';

export interface PublicContactInfo {
  configured: boolean;
  address: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  whatsapp_url: string | null;
}

export interface PublicAnnouncementConfig {
  is_active: boolean;
  badge: string;
  message: string;
  cta_label: string;
  cta_path: string;
}

export interface PublicSchoolSettingsState {
  isLoading: boolean;
  contactInfo: PublicContactInfo | null;
  announcement: PublicAnnouncementConfig | null;
  refresh: () => Promise<void>;
}

const listeners = new Set<() => void>();
let cachedContactInfo: PublicContactInfo | null = null;
let cachedAnnouncement: PublicAnnouncementConfig | null = null;
let hasFetchedOnce = false;

async function fetchPublicSettingsFromSupabase(): Promise<void> {
  const client = createPublicSupabaseClient();
  if (!client) {
    hasFetchedOnce = true;
    return;
  }

  try {
    const { data, error } = await client
      .from('school_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['public_contact_info', 'public_announcement'])
      .eq('is_public', true);

    if (error || !Array.isArray(data)) {
      hasFetchedOnce = true;
      return;
    }

    let nextContact: PublicContactInfo | null = null;
    let nextAnnouncement: PublicAnnouncementConfig | null = null;

    for (const row of data) {
      if (row.setting_key === 'public_contact_info' && row.setting_value) {
        const val = row.setting_value as Partial<PublicContactInfo>;
        const hasAnyValue = Boolean(
          val.address?.trim() || val.phone?.trim() || val.email?.trim() || val.hours?.trim()
        );
        nextContact = {
          configured: Boolean(val.configured && hasAnyValue),
          address: val.address?.trim() || null,
          phone: val.phone?.trim() || null,
          email: val.email?.trim() || null,
          hours: val.hours?.trim() || null,
          whatsapp_url: val.whatsapp_url?.trim() || null,
        };
      }
      if (row.setting_key === 'public_announcement' && row.setting_value) {
        const val = row.setting_value as Partial<PublicAnnouncementConfig>;
        const message = val.message?.trim() || '';
        const rawPath = val.cta_path?.trim() || '/apply';
        const safePath = rawPath.startsWith('/') && !rawPath.startsWith('//') ? rawPath : '/apply';
        nextAnnouncement = {
          is_active: Boolean(val.is_active && message),
          badge: val.badge?.trim() || 'Notice',
          message,
          cta_label: val.cta_label?.trim() || 'Apply Now',
          cta_path: safePath,
        };
      }
    }

    cachedContactInfo = nextContact;
    cachedAnnouncement = nextAnnouncement;
    hasFetchedOnce = true;
    listeners.forEach((cb) => cb());
  } catch {
    hasFetchedOnce = true;
  }
}

export function notifyPublicSchoolSettingsChanged(): void {
  void fetchPublicSettingsFromSupabase();
}

export function usePublicSchoolSettings(): PublicSchoolSettingsState {
  const [isLoading, setIsLoading] = useState(!hasFetchedOnce);
  const [contactInfo, setContactInfo] = useState<PublicContactInfo | null>(cachedContactInfo);
  const [announcement, setAnnouncement] = useState<PublicAnnouncementConfig | null>(
    cachedAnnouncement
  );

  const syncLocal = useCallback(() => {
    setContactInfo(cachedContactInfo);
    setAnnouncement(cachedAnnouncement);
    setIsLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    await fetchPublicSettingsFromSupabase();
    syncLocal();
  }, [syncLocal]);

  useEffect(() => {
    listeners.add(syncLocal);
    if (!hasFetchedOnce) {
      void fetchPublicSettingsFromSupabase().finally(() => {
        syncLocal();
      });
    } else {
      syncLocal();
    }
    return () => {
      listeners.delete(syncLocal);
    };
  }, [syncLocal]);

  return { isLoading, contactInfo, announcement, refresh };
}
