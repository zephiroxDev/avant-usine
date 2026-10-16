from pathlib import Path
r=Path(__file__).resolve().parents[2];p=r/'.github/workflows/ios-release.yml';s=p.read_text(encoding='utf-8');s=s.split('\n  promote-verified:')[0]
s=s.replace('name: iOS IPA release','name: Private iOS betatesting 20.0.2').replace("paths: ['work/ios-app/release.json', '.github/workflows/ios-release.yml']","paths: ['.github/workflows/ios-beta-20v00-2.yml', 'work/ios-app/scripts/configure-beta-20.py']").replace('group: ios-release','group: ios-beta-20v00-2').replace("    if: ${{ !contains(github.event.head_commit.message, '[verified-ios]') }}\n",'')
s=s.replace('      - name: Prepare embedded interface and test','      - name: Configure private test package\n        run: python3 work/ios-app/scripts/configure-beta-20.py\n      - name: Prepare embedded interface and test')
s=s.replace('"build/Avant-Usine-iOS-$VERSION-non-signe.ipa"','"build/betatesting-20-0-2-test-1.ipa"').replace('name: ios-verified','name: ios-beta-20-0-2-test-1').replace('name: ios-island-display','name: ios-beta-island-display')
s=s.split('      - name: Publish verified iOS distribution')[0]
(r/'.github/workflows/ios-beta-20v00-2.yml').write_text(s,encoding='utf-8')
print('Beta workflow only creates authenticated Actions artifacts, never a public release.')
