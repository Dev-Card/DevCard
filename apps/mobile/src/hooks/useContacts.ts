import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedContact } from '../types';

// ── Storage Key ───────────────────────────────────────────────────────────────

const CONTACTS_KEY = 'devcard.contacts';

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseContactsResult {
  contacts: SavedContact[];
  loading: boolean;
  saveContact: (contact: Omit<SavedContact, 'savedAt'>) => Promise<void>;
  removeContact: (username: string) => Promise<void>;
  isContactSaved: (username: string) => boolean;
  refetch: () => Promise<void>;
}

export function useContacts(): UseContactsResult {
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContacts = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CONTACTS_KEY);
      if (raw) {
        const parsed: SavedContact[] = JSON.parse(raw);
        // Sort by most recently saved first
        parsed.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        setContacts(parsed);
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const persistContacts = async (updated: SavedContact[]) => {
    try {
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
      setContacts(updated);
    } catch (error) {
      console.error('Failed to persist contacts:', error);
    }
  };

  const saveContact = useCallback(
    async (contact: Omit<SavedContact, 'savedAt'>) => {
      const existing = contacts.filter((c) => c.username !== contact.username);
      const newContact: SavedContact = {
        ...contact,
        savedAt: new Date().toISOString(),
      };
      const updated = [newContact, ...existing];
      await persistContacts(updated);
    },
    [contacts],
  );

  const removeContact = useCallback(
    async (username: string) => {
      const updated = contacts.filter((c) => c.username !== username);
      await persistContacts(updated);
    },
    [contacts],
  );

  const isContactSaved = useCallback(
    (username: string) => contacts.some((c) => c.username === username),
    [contacts],
  );

  return {
    contacts,
    loading,
    saveContact,
    removeContact,
    isContactSaved,
    refetch: loadContacts,
  };
}
