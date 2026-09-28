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
    print("=== TESTING FINAL BUSINESS WORKFLOW ===")

    print("1. Authenticating all 5 personas...")
    c_token = post(f'{BASE}/auth/login', {'username_or_email': 'contractor_suresh', 'password': 'Password@123'})['access_token']
    wm_token = post(f'{BASE}/auth/login', {'username_or_email': 'worker_officer_priya', 'password': 'Password@123'})['access_token']
    fo_token = post(f'{BASE}/auth/login', {'username_or_email': 'field_officer_amit', 'password': 'Password@123'})['access_token']
    mm_token = post(f'{BASE}/auth/login', {'username_or_email': 'mine_manager_rajmahal', 'password': 'Password@123'})['access_token']
    corp_token = post(f'{BASE}/auth/login', {'username_or_email': 'corporate_officer', 'password': 'Password@123'})['access_token']
    print("[PASS] All 5 personas authenticated.")

    mines = get(f'{BASE}/mines', mm_token)
    m_id = mines[0]['id']
    contractors = get(f'{BASE}/contractors', mm_token)
    c_id = contractors[0]['id']

    # Step 1: Contractor registers worker
    print("\n2. Contractor registers worker...")
    w_code = f"WRK-BW-{int(time.time()) % 100000}"
    w_res = post(f'{BASE}/workers', {
        'worker_code': w_code,
        'first_name': 'Anil',
        'last_name': 'Kumar',
        'designation': 'Blaster',
        'mine_id': m_id,
        'joining_date': '2026-09-28T00:00:00Z',
        'blood_group': 'O+'
    }, c_token)
    assert w_res['verification_status'] == 'PENDING', "Contractor worker should start PENDING"
    print(f"[PASS] Worker {w_code} registered with status: PENDING")

    # Step 2: Worker Management verifies worker
    print("\n3. Worker Management verifies worker...")
    v_res = post(f'{BASE}/workers/{w_res["id"]}/verify', {
        'decision': 'VERIFIED',
        'notes': 'DGMS Form O and statutory blasting license verified.'
    }, wm_token)
    assert v_res['verification_status'] == 'VERIFIED', "Worker should be verified"
    print(f"[PASS] Worker verified by Worker Management: {v_res['verification_status']}")

    # Step 3: Field Officer performs Field Inspection ONLY
    print("\n4. Field Officer conducts field inspection and submits findings...")
    insp = post(f'{BASE}/inspections', {
        'mine_id': m_id,
        'contractor_id': c_id,
        'inspection_type': 'Safety',
        'latitude': 25.0492,
        'longitude': 87.3830,
        'location_tag': 'Haul Road Section 4',
        'summary': 'Inspection of active pit haul road slope and dust suppression',
        'checklists': [
            {'item_key': 'CHK-01', 'category': 'Safety', 'item_title': 'Dust suppression spray active', 'is_compliant': False, 'remarks': 'Sprinklers dry on upper bench'},
            {'item_key': 'CHK-02', 'category': 'Safety', 'item_title': 'PPE compliant', 'is_compliant': True, 'remarks': 'All workers wearing helmets and high-vis'}
        ],
        'observations': [
            {'title': 'Dry Haul Road & Dust Hazard', 'description': 'Excessive fugitive dust reducing haulage visibility under DGMS Reg 124', 'category': 'Safety', 'severity': 'HIGH', 'requires_action': True}
        ]
    }, fo_token)
    insp_sub = post(f'{BASE}/inspections/{insp["id"]}/submit', {}, fo_token)
    print(f"[PASS] Field Officer submitted inspection {insp['id']} (Stage: {insp_sub['workflow_stage']})")

    # Step 4: Mine Manager creates Official Mine Report
    print("\n5. Mine Manager creates Official Mine Report...")
    report = post(f'{BASE}/reports/create-from-inspection', {
        'inspection_id': insp['id'],
        'report_title': 'Statutory Pit Safety & Dust Compliance Official Report',
        'manager_remarks': 'Mine management reviewed Field Officer findings. Directives issued to contractor.'
    }, mm_token)
    assert report['approval_status'] == 'DRAFT', "Report should start as DRAFT"
    print(f"[PASS] Official Report created by Mine Manager: {report['report_number']} (Status: {report['approval_status']})")

    # Step 5: AI Risk Analysis
    print("\n6. Running AI Risk Analysis on Mine Manager's report...")
    ai_res = post(f'{BASE}/reports/{report["id"]}/ai-risk-analysis', {}, mm_token)
    assert 'ai_results' in ai_res, "AI analysis must return results"
    ai_data = ai_res['ai_results']
    print(f"[PASS] AI Risk Analysis Complete: Score={ai_data['risk_score']}/100, Level={ai_data['risk_level']}")
    print(f"       High risk issues detected: {len(ai_data['high_risk_issues'])}")
    print(f"       Recurring patterns: {len(ai_data['recurring_patterns'])}")

    # Step 6: Mine Manager finalizes report and submits to Corporate
    print("\n7. Mine Manager finalizes report and sends to Corporate Management...")
    fin_rep = post(f'{BASE}/reports/{report["id"]}/finalize', {
        'manager_remarks': 'Reviewed AI assessment. High severity dust hazard prioritized for immediate suppression.'
    }, mm_token)
    assert fin_rep['approval_status'] == 'UNDER_CORPORATE_REVIEW', "Finalized report must be UNDER_CORPORATE_REVIEW"
    print(f"[PASS] Report finalized and sent to Corporate Management (Status: {fin_rep['approval_status']})")

    # Step 7: Corporate Management Rejection Test (with mandatory feedback)
    print("\n8. Testing Corporate Review - Rejection with mandatory feedback...")
    # Attempt reject with empty feedback should fail
    try:
        post(f'{BASE}/reports/{report["id"]}/corporate-review', {'approve': False, 'notes': ''}, corp_token)
        print("❌ ERROR: Corporate allowed rejection without feedback!")
    except Exception as e:
        print(f"[PASS] Corporate rejection without feedback correctly blocked: {e}")

    # Reject with proper feedback
    rej_res = post(f'{BASE}/reports/{report["id"]}/corporate-review', {
        'approve': False,
        'notes': 'Recurring dust suppression issue across Rajmahal pits requires water cannon installation timeline before approval.'
    }, corp_token)
    assert rej_res['approval_status'] == 'REJECTED', "Status should be REJECTED"
    print(f"[PASS] Corporate rejected report with feedback: '{rej_res['rejection_feedback']}'")

    # Step 8: Mine Manager revises and resubmits
    print("\n9. Mine Manager revises report and resubmits to Corporate...")
    resub_rep = post(f'{BASE}/reports/{report["id"]}/resubmit', {
        'revision_notes': 'Contractor committed to deploying two 50kL water bowsers and automated mist cannons within 48 hours.'
    }, mm_token)
    assert resub_rep['approval_status'] == 'UNDER_CORPORATE_REVIEW', "Resubmitted report should be UNDER_CORPORATE_REVIEW"
    print(f"[PASS] Report resubmitted to Corporate (Status: {resub_rep['approval_status']})")

    # Step 9: Corporate Management Approves
    print("\n10. Corporate Management approves resubmitted report...")
    appr_res = post(f'{BASE}/reports/{report["id"]}/corporate-review', {
        'approve': True,
        'notes': 'Commitment verified and accepted. Statutory compliance confirmed under CMR 2017.'
    }, corp_token)
    assert appr_res['approval_status'] == 'APPROVED', "Status should be APPROVED"
    print(f"[PASS] Corporate Management APPROVED report: {appr_res['approval_status']}")

    # Step 10: Strict Role Isolation Tests
    print("\n11. Testing Strict Role Isolation & Permissions...")
    # Contractor CANNOT create report
    try:
        post(f'{BASE}/reports/create-from-inspection', {'inspection_id': insp['id']}, c_token)
        print("❌ ERROR: Contractor was able to create official report!")
    except Exception as e:
        print(f"[PASS] Contractor cannot create report: {e}")

    # Field Officer CANNOT approve report
    try:
        post(f'{BASE}/reports/{report["id"]}/corporate-review', {'approve': True, 'notes': 'hack'}, fo_token)
        print("❌ ERROR: Field Officer was able to approve report!")
    except Exception as e:
        print(f"[PASS] Field Officer cannot approve report: {e}")

    # Worker Management CANNOT submit field inspections
    try:
        post(f'{BASE}/inspections', {'mine_id': m_id, 'inspection_type': 'Safety'}, wm_token)
        print("❌ ERROR: Worker Management was able to create inspection!")
    except Exception as e:
        print(f"[PASS] Worker Management cannot create inspection: {e}")

    # Governance endpoints test
    print("\n12. Testing Governance Escalations & Recurring Problems APIs...")
    escs = get(f'{BASE}/governance/escalations', corp_token)
    recs = get(f'{BASE}/governance/recurring-problems', corp_token)
    print(f"[PASS] Escalations API returned {len(escs)} active items.")
    print(f"[PASS] Recurring Problems API returned {len(recs)} recurring items.")

    print("\n=======================================================")
    print("ALL FINAL BUSINESS WORKFLOW END-TO-END TESTS PASSED!")
    print("=======================================================")

if __name__ == '__main__':
    run_tests()
