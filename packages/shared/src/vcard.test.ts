import { describe, it, expect } from 'vitest';
import { generateVCard, VCardInput } from './vcard';
import { PlatformLink } from './types';

describe('vCard Generator', () => {
  const mockLinks: PlatformLink[] = [
    {
      id: '1',
      platform: 'github',
      username: 'octocat',
      url: 'https://github.com/octocat',
      displayOrder: 1,
    },
    {
      id: '2',
      platform: 'linkedin',
      username: 'octo-li',
      url: 'https://linkedin.com/in/octo-li',
      displayOrder: 2,
    },
    {
      id: '3',
      platform: 'email',
      username: 'octocat@github.com',
      url: 'mailto:octocat@github.com',
      displayOrder: 3,
    },
  ];

  it('should generate basic vCard with correct metadata and name splitting', () => {
    const profile: VCardInput = {
      displayName: 'Jane Doe',
      username: 'janedoe',
      bio: 'Software engineer from the cloud.',
      pronouns: 'she/her',
      role: 'Staff Engineer',
      company: 'Acme Corp',
      avatarUrl: 'https://example.com/avatar.jpg',
      links: mockLinks,
      devcardUrl: 'https://devcard.dev/u/janedoe',
    };

    const vcard = generateVCard(profile);
    
    // Check line endings are CRLF
    expect(vcard).toContain('\r\n');
    
    const lines = vcard.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCARD');
    expect(lines[1]).toBe('VERSION:3.0');
    expect(vcard).toContain('FN:Jane Doe');
    expect(vcard).toContain('N:Doe;Jane;;;');
    expect(vcard).toContain('ORG:Acme Corp');
    expect(vcard).toContain('TITLE:Staff Engineer');
    expect(vcard).toContain('EMAIL;TYPE=INTERNET:octocat@github.com');
    expect(vcard).toContain('NOTE:Software engineer from the cloud.\\nPronouns: she/her\\nRole: Staff Engineer @ Acme Corp');

    expect(vcard).toContain('PHOTO;VALUE=URI:https://example.com/avatar.jpg');
    expect(vcard).toContain('URL;type=DevCard:https://devcard.dev/u/janedoe');
    expect(vcard).toContain('URL;type=Github:https://github.com/octocat');
    expect(vcard).toContain('URL;type=Linkedin:https://linkedin.com/in/octo-li');
    // Ensure email is not listed in URL;type=Email
    expect(vcard).not.toContain('URL;type=Email');
    expect(lines[lines.length - 1]).toBe('END:VCARD');
  });

  it('should escape semicolons, commas, backslashes, and multiline bios', () => {
    const profile: VCardInput = {
      displayName: 'Doe, John; Jr.',
      username: 'johndoe',
      bio: 'Hello \\ World;\nNew Line, here.',
      role: 'Senior; Developer',
      company: 'Acme, Inc.',
    };

    const vcard = generateVCard(profile);
    
    expect(vcard).toContain('FN:Doe\\, John\\; Jr.');
    expect(vcard).toContain('ORG:Acme\\, Inc.');
    expect(vcard).toContain('TITLE:Senior\\; Developer');
    expect(vcard).toContain('NOTE:Hello \\\\ World\\;\\nNew Line\\, here.');
  });

  it('should split single names correctly and handle missing fields gracefully', () => {
    const profile: VCardInput = {
      displayName: 'Cher',
      username: 'cher',
    };

    const vcard = generateVCard(profile);
    
    expect(vcard).toContain('FN:Cher');
    expect(vcard).toContain('N:;Cher;;;');
    expect(vcard).not.toContain('ORG:');
    expect(vcard).not.toContain('TITLE:');
    expect(vcard).not.toContain('EMAIL:');
    expect(vcard).not.toContain('NOTE:');
  });

  it('should parse email and tel protocol URLs correctly', () => {
    const linksWithProtocols: PlatformLink[] = [
      {
        id: '1',
        platform: 'custom',
        username: '+1234567890',
        url: 'tel:+1234567890',
        displayOrder: 1,
      },
    ];

    const profile: VCardInput = {
      displayName: 'Bob Smith',
      username: 'bob',
      links: linksWithProtocols,
    };

    const vcard = generateVCard(profile);
    
    expect(vcard).toContain('TEL;TYPE=CELL:+1234567890');
  });
});
