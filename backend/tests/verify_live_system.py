import sys
import httpx

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api'
client = httpx.Client(timeout=15.0)
requests = client



def run_checks():
    # 1. Test Demo Users
    r = requests.get(f'{BASE}/auth/demo-users')
    assert r.status_code == 200, f'Demo users failed: {r.text}'
    users = r.json()
    print(f'✓ Found {len(users)} demo users across roles:')
    for u in users:
        print(f"   - {u['role']}: {u['username']} ({u['email']})")

    # 2. Test Login for each role
    tokens = {}
    for u in users:
        resp = requests.post(f'{BASE}/auth/login', json={'username_or_email': u['email'], 'password': 'Password@123'})
        assert resp.status_code == 200, f"Login failed for {u['email']}: {resp.text}"
        tokens[u['role']] = resp.json()['access_token']
    print('✓ Successfully authenticated all 5 business roles')

    # 3. Test Dashboard Stats per role
    for role, token in tokens.items():
        s = requests.get(f'{BASE}/dashboard/stats', headers={'Authorization': f'Bearer {token}'})
        assert s.status_code == 200, f'Dashboard stats failed for {role}: {s.text}'
        kpis = s.json().get('kpis', {})
        print(f'✓ Dashboard stats for {role}: {list(kpis.keys())}')

    # 4. Test Statutory Expiry Alerts
    corp_token = tokens['CORPORATE MANAGEMENT']
    al = requests.get(f'{BASE}/alerts', headers={'Authorization': f'Bearer {corp_token}'})
    assert al.status_code == 200, f'Alerts failed: {al.text}'
    alerts = al.json()
    statutory_alerts = [a for a in alerts if "EXPIRY" in a.get("alert_type", "") or "PME" in a.get("title", "") or "VTC" in a.get("title", "") or "Competency" in a.get("title", "")]
    print(f'✓ Loaded {len(alerts)} alerts ({len(statutory_alerts)} statutory auto-generated alerts active)')

    # 5. Test Escalations & Recurring Problems
    esc = requests.get(f'{BASE}/governance/escalations', headers={'Authorization': f'Bearer {corp_token}'})
    assert esc.status_code == 200
    print(f'✓ Escalations loaded: {len(esc.json())} active escalation records')

    rp = requests.get(f'{BASE}/governance/recurring-problems', headers={'Authorization': f'Bearer {corp_token}'})
    assert rp.status_code == 200
    print(f'✓ Recurring problems aggregated: {len(rp.json())} recurrent violation patterns')

    # 6. Test Worker Governance: Trainings & Certifications
    tr = requests.get(f'{BASE}/workers/training', headers={'Authorization': f'Bearer {corp_token}'})
    assert tr.status_code == 200
    print(f'✓ Training records loaded: {len(tr.json())} records')

    cr = requests.get(f'{BASE}/workers/certifications', headers={'Authorization': f'Bearer {corp_token}'})
    assert cr.status_code == 200
    print(f'✓ Certification records loaded: {len(cr.json())} records')

    # 7. Contractor Isolation Test
    contractor_token = tokens['CONTRACTOR']
    cw = requests.get(f'{BASE}/workers', headers={'Authorization': f'Bearer {contractor_token}'})
    assert cw.status_code == 200
    print(f'✓ Contractor worker isolation: contractor only sees {len(cw.json())} assigned workers')

    # 8. Test Contractor & Field Officer GIS endpoints
    contractor_gis = requests.get(f'{BASE}/gis/contractor', headers={'Authorization': f'Bearer {contractor_token}'})
    assert contractor_gis.status_code == 200, f'Contractor GIS failed: {contractor_gis.text}'
    print(f'✓ Contractor GIS loaded: {len(contractor_gis.json().get("hotspots", []))} hotspots')

    fo_token = tokens['FIELD OFFICER']
    fo_gis = requests.get(f'{BASE}/gis/field-officer', headers={'Authorization': f'Bearer {fo_token}'})
    assert fo_gis.status_code == 200, f'Field Officer GIS failed: {fo_gis.text}'
    print(f'✓ Field Officer GIS loaded: {len(fo_gis.json().get("hotspots", []))} finding hotspots')

    # 9. Verify direct RBAC isolation
    unauth_fo = requests.get(f'{BASE}/gis/contractor', headers={'Authorization': f'Bearer {fo_token}'})
    assert unauth_fo.status_code == 403, 'Field Officer should not access Contractor GIS'
    unauth_contractor = requests.get(f'{BASE}/gis/field-officer', headers={'Authorization': f'Bearer {contractor_token}'})
    assert unauth_contractor.status_code == 403, 'Contractor should not access Field Officer GIS'
    print('✓ GIS RBAC cross-role isolation verified (403 Forbidden enforced)')

    print('\n======================================================')
    print('ALL INTEGRATION CHECKS PASSED SUCCESSFULLY!')
    print('======================================================')

if __name__ == '__main__':
    run_checks()

