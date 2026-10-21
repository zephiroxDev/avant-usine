export function allowedBetaRelease(m) {
  if (!m || typeof m !== 'object') return false;
  const old = m.patch === '20.0.2' && m.version === '2.0.2'
    && /^betatesting-20-0-2-test-[1-9][0-9]*\.ipa$/.test(m.object_path)
    && Number.isInteger(m.build_number) && m.build_number >= 30;
  const handoff = m.patch === '20.0.3' && m.version === '2.0.3'
    && ['betatesting-20-0-3-test-2.ipa','betatesting-20-0-2-test-31.ipa'].includes(m.object_path) && m.build_number === 31;
  return old || handoff;
}

