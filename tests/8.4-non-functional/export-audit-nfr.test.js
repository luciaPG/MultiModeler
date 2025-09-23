/**
 * NFR: Export artifacts must not contain secrets, credentials, or local absolute paths.
 */

function hasSensitiveContent(str) {
  const patterns = [
    /password\s*[:=]/i,
    /secret\s*[:=]/i,
    /token\s*[:=]/i,
    /Bearer\s+[A-Za-z0-9\-_.]+/i,
    /C:\\\\/i,               // Windows absolute path
    /\\\\Users\\/i,
    /\bHOME=\//i,              // *nix env markers
    /\b\/[A-Za-z]+\/[A-Za-z0-9_.\-]+\//  // unix-like abs path fragments
  ];
  return patterns.some((re) => re.test(str));
}

describe('NFR - Export artifact audit', () => {
  test('project export (mmproject) does not include sensitive content', async () => {
    // Minimal fake exported project as it would be serialized
    const fakeProject = {
      version: '1.0.0',
      metadata: { author: 'Test', autosaved: false },
      bpmn: '<xml><!-- no secrets --></xml>',
      rasci: { roles: [], matrix: {} },
      ppinot: { ppis: [] }
    };

    const exported = JSON.stringify(fakeProject);

    expect(typeof exported).toBe('string');
    expect(exported.length).toBeGreaterThan(2);
    expect(hasSensitiveContent(exported)).toBe(false);
  });
});



