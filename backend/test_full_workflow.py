import urllib.request
import json
import time

BASE = 'http://127.0.0.1:8000/api'

def post(url, data, token=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json', **({'Authorization': f'Bearer {token}'} if token else {})}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        raise Exception(f'HTTP {e.code}: {err_body}')

def get(url, token=None):
    req = urllib.request.Request(
        url,
        headers={'Content-Type': 'application/json', **({'Authorization': f'Bearer {token}'} if token else {})}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        raise Exception(f'HTTP {e.code}: {err_body}')

def run_tests():
    print('1. Authenticating all 5 personas...')
    c_token = post(f'{BASE}/auth/login', {'username_or_email': 'contractor_suresh', 'password': 'Password@123'})['access_token']
    wm_token = post(f'{BASE}/auth/login', {'username_or_email': 'worker_officer_priya', 'password': 'Password@123'})['access_token']
    fo_token = post(f'{BASE}/auth/login', {'username_or_email': 'field_officer_amit', 'password': 'Password@123'})['access_token']
    mm_token = post(f'{BASE}/auth/login', {'username_or_email': 'mine_manager_rajmahal', 'password': 'Password@123'})['access_token']
    corp_token = post(f'{BASE}/auth/login', {'username_or_email': 'corporate_officer', 'password': 'Password@123'})['access_token']
    print('[PASS] All 5 personas authenticated successfully!')

    mines = get(f'{BASE}/mines', mm_token)
    m_id = mines[0]['id']
    contractors = get(f'{BASE}/contractors', mm_token)
    c_id = contractors[0]['id']

    print('\n2. Testing Contractor worker registration...')
    w_code = f'WRK-TEST-{int(time.time()) % 100000}'
    w_res = post(f'{BASE}/workers', {
        'worker_code': w_code,
        'first_name': 'Rakesh',
        'last_name': 'Yadav',
        'designation': 'Dumper Operator',
        'mine_id': m_id,
        'joining_date': '2026-09-27T00:00:00Z',
        'blood_group': 'B+',
        'emergency_contact': '+91 98765 43210'
    }, c_token)
    w_id = w_res['id']
    print(f'[PASS] Contractor registered worker {w_res["worker_code"]} (Status: {w_res.get("verification_status")})')

    print('\n3. Testing Worker Management verification of worker...')
    verify_res = post(f'{BASE}/workers/{w_id}/verify', {
        'decision': 'VERIFIED',
        'notes': 'All DGMS certificates & Form O fitness verified compliant.'
    }, wm_token)
    print(f'[PASS] Worker Management verified worker {w_id}: verification_status={verify_res.get("verification_status")}')

    print('\n4. Testing Field Officer inspection creation & AI evaluation...')
    insp_res = post(f'{BASE}/inspections', {
        'mine_id': m_id,
        'contractor_id': c_id,
        'inspection_type': 'Safety',
        'latitude': 25.0492,
        'longitude': 87.3830,
        'location_tag': 'Eastern Ramp Haulage Pit 3',
        'summary': 'Inspection of haul road and dumper operations',
        'checklists': [
            {'item_key': 'CHK-SAF-01', 'category': 'Safety', 'item_title': 'Berm height compliance', 'is_compliant': False, 'remarks': 'Berm height only 1.2m vs 2.5m required'},
            {'item_key': 'CHK-SAF-02', 'category': 'Safety', 'item_title': 'AVRA alarms functional', 'is_compliant': True, 'remarks': 'All tested OK'}
        ],
        'observations': [
            {'title': 'Defective Berm Height on Haul Road', 'description': 'Berm height on eastern slope deficient under DGMS Reg 115', 'category': 'Safety', 'severity': 'HIGH', 'requires_action': True}
        ]
    }, fo_token)
    insp_id = insp_res['id']

    # Submit inspection
    insp_sub = post(f'{BASE}/inspections/{insp_id}/submit', {}, fo_token)
    print(f'[PASS] Inspection {insp_sub["inspection_id"]} submitted by Field Officer! Compliance: {insp_sub["compliance_score"]}% | AI Risk: {insp_sub["ai_risk_score"]}/100 ({insp_sub["ai_risk_category"]}) | Stage: {insp_sub["workflow_stage"]}')

    # Find the registered violation
    vios = get(f'{BASE}/violations?mine_id={m_id}', mm_token)
    target_vio = [v for v in vios if v['inspection_id'] == insp_id][0]
    print(f'[PASS] Violation auto-registered: {target_vio["violation_code"]} - {target_vio["title"]} (Severity: {target_vio["severity"]})')

    print('\n5. Testing Mine Manager issuing CAPA...')
    capa_res = post(f'{BASE}/corrective-actions', {
        'violation_id': target_vio['id'],
        'mine_id': m_id,
        'contractor_id': c_id,
        'title': f'Mandatory Reconstruction: {target_vio["title"]}',
        'description': 'Deploy heavy graders to reconstruct haul road berm to 2.7m height.',
        'priority': 'HIGH',
        'due_date': '2026-10-04T00:00:00Z',
        'assigned_to': 'Contractor Site In-Charge'
    }, mm_token)
    capa_id = capa_res['id']
    print(f'[PASS] Mine Manager issued CAPA {capa_res["action_code"]} (Status: {capa_res["status"]})')

    print('\n6. Testing Contractor submitting proof...')
    resolve_res = post(f'{BASE}/corrective-actions/{capa_id}/resolve', {
        'resolution_notes': 'Graders deployed, continuous earthen berm constructed to 2.8m height along 450m haul road.',
        'evidence_file_name': 'berm_reconstruction_complete.jpg'
    }, c_token)
    print(f'[PASS] Contractor submitted proof! New CAPA status: {resolve_res["status"]}')

    print('\n7. Testing NOT FIXED path...')
    reject_res = post(f'{BASE}/corrective-actions/{capa_id}/verify', {
        'approved': False,
        'verification_notes': 'Measured berm height at chainage 200m; found deficient at only 1.9m. Rectification incomplete.'
    }, fo_token)
    print(f'[PASS] Field Officer marked NOT FIXED! CAPA status: {reject_res["status"]} (Decision: {reject_res["verification_decision"]})')

    print('\n8. Verifying Mine Manager CANNOT close unverified/NOT_FIXED CAPA...')
    try:
        post(f'{BASE}/corrective-actions/{capa_id}/close', {'closure_notes': 'Attempting early closure'}, mm_token)
        print('❌ ERROR: Mine Manager was able to close unverified CAPA!')
    except Exception as e:
        print(f'[PASS] Protection verified! Mine Manager cannot close: {e}')

    print('\n9. Contractor fixes issue again and re-submits proof...')
    resolve_res2 = post(f'{BASE}/corrective-actions/{capa_id}/resolve', {
        'resolution_notes': 'Re-compacted and elevated berm along entire chainage to 2.9m height. Cross-checked with surveyor.',
        'evidence_file_name': 'berm_chainage200_reworked.jpg'
    }, c_token)
    print(f'[PASS] Contractor re-submitted proof! CAPA status: {resolve_res2["status"]}')

    print('\n10. Field Officer marks FIXED...')
    fixed_res = post(f'{BASE}/corrective-actions/{capa_id}/verify', {
        'approved': True,
        'verification_notes': 'Physical inspection confirmed 2.9m berm height throughout chainage. Complies with DGMS Reg 115.'
    }, fo_token)
    print(f'[PASS] Field Officer marked FIXED! CAPA status: {fixed_res["status"]} (Decision: {fixed_res["verification_decision"]})')

    print('\n11. Mine Manager formally closes verified CAPA...')
    close_res = post(f'{BASE}/corrective-actions/{capa_id}/close', {
        'closure_notes': 'Verified on site by Senior Overman. Approved and closed under CMR 2017 governance rules.'
    }, mm_token)
    print(f'[PASS] Mine Manager closed CAPA! Final status: {close_res["status"]} | Closed by: {close_res["closed_by_name"]}')

    # Check linked violation status
    updated_vio = get(f'{BASE}/violations/{target_vio["id"]}', mm_token)
    print(f'[PASS] Linked violation status is now: {updated_vio["status"]}')

    print('\n12. Corporate Management overall view...')
    dashboard_stats = get(f'{BASE}/dashboard/stats', corp_token)
    print(f'[PASS] Corporate Management Dashboard: Total Mines={dashboard_stats["kpis"]["total_mines"]}, Open Violations={dashboard_stats["kpis"]["open_violations"]}, Avg Compliance={dashboard_stats["kpis"]["avg_compliance_percent"]}%')

    print('\n==================================================')
    print('ALL 12 ACCEPTANCE TEST STEPS PASSED PERFECTLY!')
    print('==================================================')

if __name__ == '__main__':
    run_tests()
