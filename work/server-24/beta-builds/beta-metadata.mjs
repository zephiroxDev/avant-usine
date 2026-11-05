export function allowedBetaRelease(m) {
  if (!m || typeof m !== 'object') return false;
  const old = m.patch === '20.0.2' && m.version === '2.0.2'
    && /^betatesting-20-0-2-test-[1-9][0-9]*\.ipa$/.test(m.object_path)
    && Number.isInteger(m.build_number) && m.build_number >= 30;
  const handoff = m.patch === '20.0.3' && m.version === '2.0.3'
    && ['betatesting-20-0-3-test-2.ipa','betatesting-20-0-2-test-31.ipa'].includes(m.object_path) && m.build_number === 31;
  const experience = m.patch === '2.0.5' && m.version === '2.0.5'
    && ((m.object_path === 'betatesting-2-0-5-test-1.ipa' && m.build_number === 35)
      || (m.object_path === 'betatesting-2-0-5-test-2.ipa' && m.build_number === 36)
      || (m.object_path === 'betatesting-2-0-5-test-3.ipa' && m.build_number === 37));
  const repair221 = m.patch === '22.1' && m.version === '2.2.1' && ((m.build_number === 42 && ['betatesting-22-1-test-1.ipa','betatesting-22-1-0-test-1.ipa'].includes(m.object_path)) || (m.build_number === 43 && m.object_path === 'betatesting-22-1-0-test-2.ipa'));
  // 24.0 onwards: any numbered test build for iPhone (IPA) or Windows (EXE).
  const current = /^2[4-9]\.[0-9]+(\.[0-9]+)?$/.test(String(m.patch)) && /^[0-9]+\.[0-9]+\.[0-9]+$/.test(String(m.version))
    && ((m.platform === 'ios' && /^betatesting-[0-9-]+-ios-test-[1-9][0-9]*\.ipa$/.test(m.object_path))
      || (m.platform === 'windows' && /^betatesting-[0-9-]+-windows-test-[1-9][0-9]*\.exe$/.test(m.object_path)));
  return old || handoff || experience || repair221 || current;
}
