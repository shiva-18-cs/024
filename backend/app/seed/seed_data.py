from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.entities import (
    Base, User, UserRole, Subsidiary, Mine, Contractor, Contract, ContractRequirement,
    Document, Worker, Attendance, MedicalRecord, TrainingRecord, CertificationRecord,
    Inspection, InspectionChecklist, InspectionObservation, GeoEvidence, ComplianceRecord,
    Violation, CorrectiveAction, Report, ReportReview, Alert, AIPrediction, AuditLog, EscalationLog,
    RiskLevel, ComplianceStatus, ActionStatus, WorkflowStage
)
from app.core.security import get_password_hash

def seed_database(db: Session):
    # Check if already seeded
    if db.query(Subsidiary).count() > 0:
        return

    print("Seeding CoalGuard realistic governance database...")
    now = datetime.now(timezone.utc)

    # 1. SUBSIDIARIES (3 Major Coal India Subsidiaries)
    sub_ecl = Subsidiary(
        name="Eastern Coalfields Limited",
        code="ECL",
        headquarters="Sanctoria, West Bengal"
    )
    sub_bccl = Subsidiary(
        name="Bharat Coking Coal Limited",
        code="BCCL",
        headquarters="Dhanbad, Jharkhand"
    )
    sub_secl = Subsidiary(
        name="South Eastern Coalfields Limited",
        code="SECL",
        headquarters="Bilaspur, Chhattisgarh"
    )
    db.add_all([sub_ecl, sub_bccl, sub_secl])
    db.flush()

    # 2. MINES (5 Realistic Coal Mines with Geo-Coordinates in Indian Coalfields)
    m1 = Mine(
        name="Rajmahal Open Cast Project",
        code="ECL-OCP-01",
        subsidiary_id=sub_ecl.id,
        state="Jharkhand",
        district="Godda",
        latitude=25.0489,
        longitude=87.3821,
        production_capacity_mtpa=17.0,
        mine_type="Opencast",
        manager_name="Rajesh Kumar Verma",
        status="OPERATIONAL"
    )
    m2 = Mine(
        name="Jharia Coalfield Pit 4",
        code="BCCL-JHR-04",
        subsidiary_id=sub_bccl.id,
        state="Jharkhand",
        district="Dhanbad",
        latitude=23.7420,
        longitude=86.4150,
        production_capacity_mtpa=6.5,
        mine_type="Opencast",
        manager_name="Anil Sengupta",
        status="OPERATIONAL"
    )
    m3 = Mine(
        name="Kusmunda Mega Opencast Mine",
        code="SECL-KUS-01",
        subsidiary_id=sub_secl.id,
        state="Chhattisgarh",
        district="Korba",
        latitude=22.3385,
        longitude=82.6841,
        production_capacity_mtpa=40.0,
        mine_type="Opencast",
        manager_name="Manoj K. Sharma",
        status="OPERATIONAL"
    )
    m4 = Mine(
        name="Gevra Expansion OCP",
        code="SECL-GEV-02",
        subsidiary_id=sub_secl.id,
        state="Chhattisgarh",
        district="Korba",
        latitude=22.3524,
        longitude=82.5872,
        production_capacity_mtpa=45.0,
        mine_type="Opencast",
        manager_name="Praveen Chander",
        status="OPERATIONAL"
    )
    m5 = Mine(
        name="Sodepur Underground Colliery",
        code="ECL-SOD-03",
        subsidiary_id=sub_ecl.id,
        state="West Bengal",
        district="Paschim Bardhaman",
        latitude=23.6840,
        longitude=86.8790,
        production_capacity_mtpa=1.8,
        mine_type="Underground",
        manager_name="Debabrata Roy",
        status="OPERATIONAL"
    )
    db.add_all([m1, m2, m3, m4, m5])
    db.flush()

    # 3. CONTRACTORS (10 Realistic Mining Agencies)
    contractors_data = [
        ("ABC Mining Services Pvt Ltd", "REG-JH-2018-0941", "20AAACA1234B1Z5", "Suresh Agarwal", "contact@abcmining.com", "+91 98301 23450", 72.0, RiskLevel.HIGH.value),
        ("Deccan Coal Infra Projects", "REG-MH-2019-3382", "27AAACD9876C1Z3", "Vikram Deshmukh", "info@deccancoal.com", "+91 98220 87654", 91.5, RiskLevel.LOW.value),
        ("Gati Heavy Earthmovers Ltd", "REG-WB-2020-5519", "19AAACG4432D1Z9", "Soumen Banerjee", "corporate@gatiearth.com", "+91 94330 11223", 86.0, RiskLevel.LOW.value),
        ("Singrauli Extraction & Transport", "REG-MP-2017-7721", "23AAACS5512E1Z1", "R. P. Tiwari", "contact@singraulicorp.com", "+91 94250 88990", 68.0, RiskLevel.HIGH.value),
        ("Brahmaputra Mining Consortium", "REG-AS-2021-1204", "18AAACB6654F1Z8", "Arunav Barua", "contact@brahmaputramine.com", "+91 98640 44556", 88.5, RiskLevel.LOW.value),
        ("Kalinga Minecon Logistics", "REG-OD-2019-4481", "21AAACK9987G1Z4", "Bijay Mohapatra", "ops@kalingaminecon.com", "+91 94370 77889", 79.0, RiskLevel.MEDIUM.value),
        ("Chotanagpur Blasting Solutions", "REG-JH-2022-8810", "20AAACC1123H1Z2", "Hemant Oraon", "info@chotanagpurblast.com", "+91 98350 33445", 84.0, RiskLevel.LOW.value),
        ("Coalfield Environmental Safety Tech", "REG-DL-2020-6632", "07AAACC4455I1Z7", "Dr. Neha Kapoor", "compliance@coalfieldsafety.org", "+91 98110 55667", 95.0, RiskLevel.LOW.value),
        ("Vindhya Heavy Haulage Corp", "REG-MP-2018-2219", "23AAACV7788J1Z6", "Ashok Pandey", "contracts@vindhyahaul.in", "+91 94252 66778", 64.5, RiskLevel.HIGH.value),
        ("Mahanadi Pithead Operators", "REG-CG-2021-9923", "22AAACM3344K1Z0", "Dharmendra Sahu", "operations@mahanadipit.com", "+91 94255 12345", 89.0, RiskLevel.LOW.value),
    ]

    contractor_objs = []
    for comp, reg, gst, cont_p, em, ph, score, risk in contractors_data:
        c = Contractor(
            company_name=comp,
            reg_number=reg,
            gstin=gst,
            pan=gst[2:12],
            contact_person=cont_p,
            email=em,
            phone=ph,
            address="Industrial Coal Belt Zone, Sector 4",
            license_category="Heavy Earth Moving, Overburden Removal & Blasting",
            license_expiry=now + timedelta(days=365 if score > 70 else -15),
            compliance_score=score,
            risk_level=risk,
            is_active=True
        )
        db.add(c)
        contractor_objs.append(c)
    db.flush()

    c_abc = contractor_objs[0]  # ABC Mining Services (The key demo contractor)

    # 4. USERS (Roles matching the spec)
    pwd_hash = get_password_hash("Password@123")

    users_data = [
        ("corporate@cil.gov.in", "corporate_officer", "Shri S. K. Mahapatra (Director Tech, CIL)", UserRole.CORPORATE.value, None, None),
        ("manager.rajmahal@cil.gov.in", "mine_manager_rajmahal", "Rajesh Kumar Verma (Agent & General Manager)", UserRole.MINE_MANAGER.value, None, m1.id),
        ("manager.jharia@cil.gov.in", "mine_manager_jharia", "Anil Sengupta (Project Officer)", UserRole.MINE_MANAGER.value, None, m2.id),
        ("field.officer@cil.gov.in", "field_officer_amit", "Amitabh Singh (Senior Overman / Safety Inspector)", UserRole.FIELD_OFFICER.value, None, m1.id),
        ("contractor.abc@abcmining.com", "contractor_suresh", "Suresh Agarwal (Managing Director, ABC Mining)", UserRole.CONTRACTOR.value, c_abc.id, m1.id),
        ("worker.officer@cil.gov.in", "worker_officer_priya", "Priya Sen (Labour Welfare & PME Officer)", UserRole.WORKER_OFFICER.value, None, m1.id),
    ]

    user_objs = []
    for email, uname, fname, role, cid, mid in users_data:
        u = User(
            email=email,
            username=uname,
            hashed_password=pwd_hash,
            full_name=fname,
            role=role,
            phone="+91 98000 12345",
            contractor_id=cid,
            mine_id=mid,
            is_active=True
        )
        db.add(u)
        user_objs.append(u)
    db.flush()

    u_corp = next(u for u in user_objs if u.username == "corporate_officer")
    u_manager = next(u for u in user_objs if u.username == "mine_manager_rajmahal")
    u_field = next(u for u in user_objs if u.username == "field_officer_amit")

    # 5. CONTRACTS & REQUIREMENTS
    contracts = [
        Contract(
            contract_number="CIL-ECL-2024-WO-882",
            contractor_id=c_abc.id,
            mine_id=m1.id,
            title="Overburden Removal & Coal Haulage Sector 2B",
            scope_of_work="Excavation of 4.5 Million cubic meters of overburden and transportation to waste dump.",
            start_date=now - timedelta(days=180),
            end_date=now + timedelta(days=185),
            value_inr_crores=42.5,
            status="ACTIVE"
        ),
        Contract(
            contract_number="CIL-BCCL-2024-WO-319",
            contractor_id=contractor_objs[1].id,
            mine_id=m2.id,
            title="Fire Zone Excavation & Capping Project",
            scope_of_work="Deep trench excavation and sand stowing for pit fire control.",
            start_date=now - timedelta(days=90),
            end_date=now + timedelta(days=275),
            value_inr_crores=18.0,
            status="ACTIVE"
        ),
        Contract(
            contract_number="CIL-SECL-2024-WO-401",
            contractor_id=contractor_objs[2].id,
            mine_id=m3.id,
            title="Continuous Surface Miner Coal Extraction",
            scope_of_work="Eco-friendly blastless extraction of coal seams.",
            start_date=now - timedelta(days=60),
            end_date=now + timedelta(days=300),
            value_inr_crores=65.0,
            status="ACTIVE"
        ),
        Contract(
            contract_number="CIL-SECL-2024-WO-512",
            contractor_id=contractor_objs[3].id,
            mine_id=m4.id,
            title="Haul Road Maintenance & Dust Suppression",
            scope_of_work="Mechanical mist spraying and road gradient management.",
            start_date=now - timedelta(days=120),
            end_date=now + timedelta(days=240),
            value_inr_crores=9.5,
            status="ACTIVE"
        )
    ]
    db.add_all(contracts)
    db.flush()

    # Requirements for Contract 1 (ABC Mining)
    c1 = contracts[0]
    requirements = [
        ContractRequirement(
            contract_id=c1.id,
            title="DGMS Heavy Earth Moving Machinery (HEMM) Fitness Certification",
            regulation_code="DGMS Circular 02/2014",
            category="Safety",
            due_date=now + timedelta(days=45),
            status=ComplianceStatus.COMPLIANT.value,
            verification_status="VERIFIED"
        ),
        ContractRequirement(
            contract_id=c1.id,
            title="Air Quality & Ambient Dust Monitoring Audit",
            regulation_code="MoEFCC Clearance Cond. 4(i)",
            category="Environmental",
            due_date=now - timedelta(days=5),  # EXPIRED / OVERDUE
            status=ComplianceStatus.EXPIRED.value,
            verification_status="PENDING_SUBMISSION",
            notes="Statutory monthly air clearance report overdue by 5 days."
        ),
        ContractRequirement(
            contract_id=c1.id,
            title="Contract Labour Form V License Renewal",
            regulation_code="Contract Labour Act 1970 Sec 12",
            category="Labour",
            due_date=now + timedelta(days=120),
            status=ComplianceStatus.COMPLIANT.value,
            verification_status="VERIFIED"
        ),
        ContractRequirement(
            contract_id=c1.id,
            title="Mandatory Periodical Medical Examination (PME) Register",
            regulation_code="Mines Rules 1955 Rule 29B",
            category="Labour",
            due_date=now - timedelta(days=10),
            status=ComplianceStatus.NON_COMPLIANT.value,
            verification_status="DEFICIENT",
            notes="Identified expired PME certificates for 3 dumper operators."
        )
    ]
    db.add_all(requirements)
    db.flush()

    # 6. DOCUMENTS
    docs = [
        Document(
            contractor_id=c_abc.id,
            uploaded_by_id=user_objs[5].id,
            file_name="ABC_DGMS_Safety_Equip_2025.pdf",
            file_path="uploads/demo_dgms_safety.pdf",
            file_type="PDF",
            doc_category="DGMS Safety Certificate",
            issue_date=now - timedelta(days=150),
            expiry_date=now + timedelta(days=215),
            status=ComplianceStatus.COMPLIANT.value,
            ocr_status="PROCESSED",
            ocr_confidence=94.5,
            manual_verification_required=False,
            extracted_metadata={"license_number": "DGMS-DHN-2024-9912", "agency": "ABC Mining Services Pvt Ltd", "inspector": "Director Mines Safety"}
        ),
        Document(
            contractor_id=c_abc.id,
            uploaded_by_id=user_objs[5].id,
            file_name="ABC_Env_Clearance_WaterAir_2024.pdf",
            file_path="uploads/demo_env_clearance.pdf",
            file_type="PDF",
            doc_category="Environmental Clearance",
            issue_date=now - timedelta(days=380),
            expiry_date=now - timedelta(days=15),  # Expired
            status=ComplianceStatus.EXPIRED.value,
            ocr_status="PROCESSED",
            ocr_confidence=88.0,
            manual_verification_required=True,
            extracted_metadata={"certificate_number": "SPCB-JH-ENV-8841", "validity_status": "EXPIRED", "water_discharge": "Exceeding TSS Limit"}
        ),
        Document(
            contractor_id=contractor_objs[1].id,
            uploaded_by_id=user_objs[0].id,
            file_name="Deccan_Labour_Registration_2026.pdf",
            file_path="uploads/demo_labour_reg.pdf",
            file_type="PDF",
            doc_category="Labour Compliance License",
            issue_date=now - timedelta(days=40),
            expiry_date=now + timedelta(days=325),
            status=ComplianceStatus.COMPLIANT.value,
            ocr_status="PROCESSED",
            ocr_confidence=97.0,
            manual_verification_required=False,
            extracted_metadata={"license_no": "LAB-DLC-2024-5510", "worker_ceiling": 250}
        )
    ]
    db.add_all(docs)
    db.flush()

    # 7. WORKERS (50+ Workers across the contractors and mines)
    designations = [
        "Dumper Operator", "Shovel Operator", "Blaster & Shot Firer", "Mining Sirdar",
        "Overman", "Heavy Plant Mechanic", "Electrical Supervisor", "Surveyor",
        "Water Sprinkler Operator", "Bulldozer Driver", "Drill Operator"
    ]
    blood_groups = ["A+", "B+", "O+", "AB+", "O-"]

    first_names = [
        "Ramesh", "Dinesh", "Sanjay", "Manoj", "Pradeep", "Santosh", "Vijay", "Mukesh",
        "Alok", "Chandan", "Sunil", "Binod", "Anand", "Rajiv", "Gopal", "Subhash",
        "Deepak", "Rakesh", "Vikash", "Naresh", "Suraj", "Ajay", "Harish", "Rohit",
        "Kunal", "Tapan", "Laxman", "Basant", "Bikram", "Ashish", "Govind", "Pankaj",
        "Naveen", "Hemant", "Jagdish", "Arjun", "Karan", "Devendra", "Shiv", "Shashi",
        "Om", "Bhupesh", "Kishore", "Mahesh", "Sita", "Geeta", "Sunita", "Reena", "Pushpa", "Anita", "Mamata", "Kavita"
    ]
    last_names = [
        "Yadav", "Singh", "Prasad", "Mandal", "Murmu", "Besra", "Tudu", "Hembram",
        "Kumar", "Verma", "Mahato", "Karmakar", "Ghosh", "Rana", "Soren", "Munda",
        "Oraon", "Das", "Sharma", "Pandey", "Tiwari", "Patel", "Sahu", "Chowdhury"
    ]

    worker_objs = []
    for i in range(52):
        fn = first_names[i % len(first_names)]
        ln = last_names[i % len(last_names)]
        desig = designations[i % len(designations)]
        bg = blood_groups[i % len(blood_groups)]
        
        # Target contractor: first 15 workers under ABC Mining
        if i < 15:
            cid = c_abc.id
            mid = m1.id
        elif i < 27:
            cid = contractor_objs[1].id
            mid = m2.id
        elif i < 39:
            cid = contractor_objs[2].id
            mid = m3.id
        else:
            cid = contractor_objs[3].id
            mid = m4.id

        # Make 4 workers have expired medical certificates (sample demo scenario)
        is_med_expired = (i in [2, 5, 11, 28])
        med_exp = now - timedelta(days=20 + i) if is_med_expired else now + timedelta(days=180 + (i * 5))
        fit_status = "EXPIRED" if is_med_expired else "FIT"
        comp_status = ComplianceStatus.NON_COMPLIANT.value if is_med_expired else ComplianceStatus.COMPLIANT.value

        w = Worker(
            contractor_id=cid,
            mine_id=mid,
            worker_code=f"WKR-CIL-{1000 + i}",
            first_name=fn,
            last_name=ln,
            designation=desig,
            joining_date=now - timedelta(days=365 + (i * 10)),
            blood_group=bg,
            emergency_contact=f"+91 97711 {20000 + i}",
            is_active=True,
            medical_fitness_status=fit_status,
            medical_expiry_date=med_exp,
            compliance_status=comp_status
        )
        db.add(w)
        worker_objs.append(w)
    db.flush()

    # 8. ATTENDANCE & MEDICAL RECORDS FOR WORKERS
    for idx, w in enumerate(worker_objs):
        # Attendance records
        att = Attendance(
            worker_id=w.id,
            date=now - timedelta(hours=4),
            status="ABSENT" if idx in [7, 14, 25] else "PRESENT",
            shift="Morning" if idx % 2 == 0 else "Afternoon",
            in_time="06:02 AM",
            out_time="02:05 PM"
        )
        db.add(att)

        # Medical record
        is_expired = w.medical_fitness_status == "EXPIRED"
        med = MedicalRecord(
            worker_id=w.id,
            examination_date=w.medical_expiry_date - timedelta(days=365) if w.medical_expiry_date else now - timedelta(days=365),
            expiry_date=w.medical_expiry_date or (now + timedelta(days=365)),
            examining_doctor="Dr. B. K. Chattopadhyay, MD (Occupational Medicine)",
            hospital_name="Central Hospital Kalla, ECL / Asansol",
            fitness_status="UNFIT" if is_expired else "FIT",
            audiometry_result="SLIGHT HIGH FREQUENCY LOSS" if is_expired else "NORMAL",
            chest_xray_result="CLEAR (NO PNEUMOCONIOSIS)",
            certificate_number=f"PME-FORM-O-{8800 + idx}",
            is_expired=is_expired
        )
        db.add(med)
    db.flush()

    # Seed Training and Certification records for workers
    for idx, w in enumerate(worker_objs[:20]):
        # Vocational Training
        is_training_expired = (idx in [3, 8])
        tr = TrainingRecord(
            worker_id=w.id,
            training_type="Vocational Training (Mines Rules 1966)",
            training_name="Refresher Safety Training for Opencast Coal Mines",
            training_status="EXPIRED" if is_training_expired else "VALID",
            issue_date=now - timedelta(days=380 if is_training_expired else 100),
            expiry_date=now - timedelta(days=15 if is_training_expired else -265),
            certificate_ref=f"VTC-ECL-{202500 + idx}",
            verification_status="REJECTED" if is_training_expired else "VERIFIED",
            verified_by_id=user_objs[4].id,
            verified_at=now - timedelta(days=90)
        )
        db.add(tr)

        # Competency Certification for HEMM operators / Gas testers
        if idx % 2 == 0:
            cert = CertificationRecord(
                worker_id=w.id,
                certification_type="DGMS Statutory Competency",
                certification_name="HEMM Heavy Equipment Operator Competency (Dumpers/Excavators)",
                certificate_ref=f"DGMS-CERT-{9000 + idx}",
                issue_date=now - timedelta(days=200),
                expiry_date=now + timedelta(days=530),
                verification_status="VERIFIED",
                verified_by_id=user_objs[4].id,
                verified_at=now - timedelta(days=180)
            )
            db.add(cert)
    db.flush()

    # 9. FIELD INSPECTIONS (20 Realistic Inspections Across 5 Mines)
    inspection_types = ["Safety", "Environment", "Contractor Compliance", "Labour Compliance", "Equipment"]
    inspection_stages = [
        WorkflowStage.CORP_APPROVED.value,
        WorkflowStage.UNDER_CORPORATE_REVIEW.value,
        WorkflowStage.UNDER_MINE_MANAGER_REVIEW.value,
        WorkflowStage.VIOLATIONS_FLAGGED.value,
        WorkflowStage.MM_VALIDATED.value
    ]

    inspections = []
    # Inspection 1: THE DEMO SCENARIO INSPECTION
    insp_demo = Inspection(
        inspection_number="INSP-ECL-2026-001",
        mine_id=m1.id,
        contractor_id=c_abc.id,
        officer_id=u_field.id,
        inspection_type="Safety",
        inspection_date=now - timedelta(hours=6),
        latitude=25.0492,
        longitude=87.3830,
        location_tag="Sector 2B Main Pit Face & Haulage Ramp",
        risk_level=RiskLevel.HIGH.value,
        compliance_score=68.5,
        workflow_stage=WorkflowStage.UNDER_MINE_MANAGER_REVIEW.value,
        summary="Comprehensive shift safety audit of ABC Mining dumpers and haul roads. Identified lack of dust suppression, 2 workers with expired PME fitness certificates, and defective berm height on eastern ramp.",
        ai_risk_score=78.4,
        ai_risk_category="HIGH",
        ai_factors=[
            "2 active workers with expired statutory Form O medical fitness certificates",
            "Berm height on haul road < 2.5m (DGMS Safety Regulation 115 failure)",
            "Ambient dust suppression mist nozzles non-functional at dumping point",
            "Contractor historical open violations: 2"
        ]
    )
    inspections.append(insp_demo)

    # Add 19 more inspections
    for j in range(2, 21):
        target_mine = [m1, m2, m3, m4, m5][j % 5]
        target_cont = contractor_objs[j % len(contractor_objs)]
        itype = inspection_types[j % len(inspection_types)]
        stage = inspection_stages[j % len(inspection_stages)]
        
        # Variations in scores
        score = 88.0 if j % 3 == 0 else (62.0 if j % 5 == 0 else 94.0)
        risk = RiskLevel.LOW.value if score >= 85 else (RiskLevel.HIGH.value if score < 70 else RiskLevel.MEDIUM.value)

        insp = Inspection(
            inspection_number=f"INSP-{target_mine.code[:3]}-2026-{j:03d}",
            mine_id=target_mine.id,
            contractor_id=target_cont.id,
            officer_id=u_field.id,
            inspection_type=itype,
            inspection_date=now - timedelta(days=j * 2, hours=j),
            latitude=target_mine.latitude + (0.001 * (j % 4)),
            longitude=target_mine.longitude + (0.001 * (j % 3)),
            location_tag=f"Bench Section {j} - In-Pit Dump",
            risk_level=risk,
            compliance_score=score,
            workflow_stage=stage,
            summary=f"Routine periodic {itype.lower()} audit conducted in accordance with CIL standard operating guidelines.",
            ai_risk_score=round(100.0 - score + 5.0, 1),
            ai_risk_category=risk,
            ai_factors=[f"{itype} compliance posture evaluated against statutory norms."]
        )
        inspections.append(insp)

    db.add_all(inspections)
    db.flush()

    # 10. CHECKLISTS, OBSERVATIONS & GEO EVIDENCE FOR DEMO INSPECTION
    chk_items = [
        ("CHK-SAF-01", "Safety", "Haul road width >= 3 times largest vehicle width", True, 10, "Compliant at 18 meters width."),
        ("CHK-SAF-02", "Safety", "Earthen berm height at least equal to largest tyre height (2.7m)", False, 15, "Deficient berm of 1.4m on eastern slope (DGMS violation)."),
        ("CHK-SAF-03", "Safety", "Audio-visual reverse alarms (AVRA) functional on dumpers", True, 10, "Tested on 6 dumpers, all functional."),
        ("CHK-ENV-01", "Environmental", "Water sprinkling / mist cannon operational on haul road", False, 15, "Water bowser pump broken; severe airborne coal dust visible."),
        ("CHK-LAB-01", "Labour Compliance", "Valid Form O Medical Fitness certificates verified on-site", False, 20, "2 Dumper drivers have expired PME certificates."),
        ("CHK-PPE-01", "Personal Safety", "Mandatory PPE (fluorescent jacket, hard hat, steel-toe boots)", True, 10, "100% compliant wearing observed."),
        ("CHK-EXP-01", "Statutory Clearance", "Valid DGMS Blaster certification on duty during charge loading", True, 10, "Certificate verified.")
    ]
    for key, cat, title, comp, wt, rem in chk_items:
        db.add(InspectionChecklist(
            inspection_id=insp_demo.id,
            item_key=key,
            category=cat,
            item_title=title,
            is_compliant=comp,
            severity_weight=wt,
            remarks=rem
        ))

    db.add(InspectionObservation(
        inspection_id=insp_demo.id,
        title="Substandard Haul Road Safety Berm on Eastern Pit Ramp",
        description="Berm measures only 1.4 meters vs required 2.7 meters. High rollover hazard for CAT 777 dumpers.",
        category="Safety",
        severity="HIGH",
        requires_action=True
    ))

    db.add(InspectionObservation(
        inspection_id=insp_demo.id,
        title="Defective Dust Suppression Bowser Causing High Fugitive Emissions",
        description="Contractor water bowser non-operational. High particulate matter PM10 exceeding 450 ug/m3.",
        category="Environmental",
        severity="HIGH",
        requires_action=True
    ))

    # Geo-tagged photos / evidence
    db.add_all([
        GeoEvidence(
            inspection_id=insp_demo.id,
            file_name="evidence_berm_height_ramp_2b.jpg",
            file_path="uploads/evidence_berm_2b.jpg",
            caption="Eastern Haul Road slope berm height deficiency (1.4m)",
            latitude=25.0494,
            longitude=87.3833,
            captured_at=now - timedelta(hours=5, minutes=45),
            officer_id=u_field.id
        ),
        GeoEvidence(
            inspection_id=insp_demo.id,
            file_name="evidence_dust_cloud_loading_face.jpg",
            file_path="uploads/evidence_dust_face.jpg",
            caption="Dust cloud at excavator loading zone due to sprayer pump failure",
            latitude=25.0491,
            longitude=87.3828,
            captured_at=now - timedelta(hours=5, minutes=30),
            officer_id=u_field.id
        )
    ])
    db.flush()

    # 11. VIOLATIONS (At least 10 realistic statutory violations)
    violations_data = [
        ("VIO-ECL-26-001", m1.id, c_abc.id, insp_demo.id, "Substandard Haul Road Berm Height (DGMS Reg 115)", "Safety", RiskLevel.HIGH.value, "DGMS Coal Mines Regulations 2017 Reg 115", "Failure to maintain continuous earthen parapet/berm of required height along steep haulage gradient.", "OPEN"),
        ("VIO-ECL-26-002", m1.id, c_abc.id, insp_demo.id, "Active Workers with Expired PME Medical Certificates", "Labour & Health Compliance", RiskLevel.HIGH.value, "Mines Rules 1955 Rule 29B", "Deploying HEMM operators with expired Periodical Medical Fitness examination records.", "OPEN"),
        ("VIO-ECL-26-003", m1.id, c_abc.id, insp_demo.id, "Non-Functional Dust Suppression at Active Loading Face", "Environmental", RiskLevel.MEDIUM.value, "Air (Prevention and Control of Pollution) Act 1981", "Failure to suppress respirable dust leading to ambient air quality exceedance.", "OPEN"),
        ("VIO-BCCL-26-004", m2.id, contractor_objs[1].id, inspections[1].id, "Fire Seam Encroachment Without Nitrogen Flushing", "Safety", RiskLevel.CRITICAL.value, "DGMS Emergency Circular 2023", "Excavation into active pyritic fire zone without prior thermal imaging and inert gas blanketing.", "OPEN"),
        ("VIO-SECL-26-005", m3.id, contractor_objs[2].id, inspections[2].id, "Missing High-Voltage Ground Wire on Electric Shovel 4", "Equipment & Safety", RiskLevel.HIGH.value, "Central Electricity Authority (Safety Requirements) 2010", "Trailing cable grounding conductor open-circuited. Risk of catastrophic electrocution.", "IN_CORRECTION"),
        ("VIO-SECL-26-006", m4.id, contractor_objs[3].id, inspections[3].id, "Overspeeding Dumpers on Mine Arterial Haul Road", "Safety", RiskLevel.MEDIUM.value, "CIL Code of Practice 2019", "GPS telematics detected 3 dumpers traveling at 48 km/h in designated 25 km/h zone.", "RESOLVED"),
        ("VIO-ECL-26-007", m5.id, contractor_objs[4].id, inspections[4].id, "Underground Gas Monitoring Sensor Calibration Overdue", "Safety", RiskLevel.CRITICAL.value, "DGMS Underground Methane Protocol", "Methanometer and Carbon Monoxide continuous sensors 45 days past calibration date.", "OPEN"),
        ("VIO-ECL-26-008", m1.id, contractor_objs[5].id, inspections[5].id, "Uncertified Fuel Bowser Transferring Diesel in Pit", "Safety & Fire", RiskLevel.HIGH.value, "Petroleum Rules 2002", "Refueling excavator using unapproved secondary containment drum without earthing strap.", "RESOLVED"),
        ("VIO-BCCL-26-009", m2.id, contractor_objs[6].id, inspections[6].id, "Contractor Overburden Dump Slope Exceeding Angle of Repose", "Safety", RiskLevel.HIGH.value, "DGMS Spoil Bank Circular", "Dump slope measured at 42 degrees vs maximum permitted 37.5 degrees. High slump risk.", "IN_CORRECTION"),
        ("VIO-SECL-26-010", m3.id, contractor_objs[7].id, inspections[7].id, "Effluent Treatment Plant (ETP) Oil & Grease Exceedance", "Environmental", RiskLevel.MEDIUM.value, "Water (Prevention and Control of Pollution) Act", "Workshop runoff oil separator clogged; discharge water oil concentration at 24 mg/L vs 10 mg/L limit.", "OPEN"),
    ]

    violation_objs = []
    for code, mid, cid, iid, title, cat, sev, reg, desc, st in violations_data:
        v = Violation(
            violation_code=code,
            mine_id=mid,
            contractor_id=cid,
            inspection_id=iid,
            title=title,
            category=cat,
            severity=sev,
            regulation_reference=reg,
            description=desc,
            status=st,
            detected_at=now - timedelta(days=5),
            resolved_at=now - timedelta(days=1) if st == "RESOLVED" else None
        )
        db.add(v)
        violation_objs.append(v)
    db.flush()

    # 12. CORRECTIVE ACTIONS (At least 10 actions linked to violations)
    actions_data = [
        ("CAPA-ECL-26-001", violation_objs[0].id, c_abc.id, m1.id, "Reconstruct Earthen Safety Berm on Sector 2B Ramp", "Deploy dozer and grader to elevate berm to 2.8 meters along entire 450m incline.", "HIGH", now + timedelta(days=2), ActionStatus.ASSIGNED.value, "Suresh Agarwal (ABC Site Head)"),
        ("CAPA-ECL-26-002", violation_objs[1].id, c_abc.id, m1.id, "Stand Down Expired Workers & Schedule Emergency PME", "Immediately replace expired dumper operators and book Form O medical slots at Central Hospital.", "HIGH", now + timedelta(days=3), ActionStatus.IN_PROGRESS.value, "ABC Safety Officer"),
        ("CAPA-ECL-26-003", violation_objs[2].id, c_abc.id, m1.id, "Repair Water Bowser Spray Nozzles & Mobilize Backup Bowser", "Ensure continuous suppression on loading bench every 30 minutes during haulage shifts.", "MEDIUM", now + timedelta(days=1), ActionStatus.SUBMITTED.value, "ABC Mechanical Supervisor"),
        ("CAPA-BCCL-26-004", violation_objs[3].id, contractor_objs[1].id, m2.id, "Mobilize Liquid Nitrogen Cryogenic Blanketing Unit", "Stop excavation in Pit 4 fire zone until surface thermal signature drops below 60°C.", "CRITICAL", now - timedelta(days=1), ActionStatus.OVERDUE.value, "Deccan Fire Safety Team"),
        ("CAPA-SECL-26-005", violation_objs[4].id, contractor_objs[2].id, m3.id, "Replace Damaged Trailing Cable Section on Shovel 4", "Perform mega-ohm insulation resistance test and submit test certificate to Electrical Inspector.", "HIGH", now + timedelta(days=4), ActionStatus.UNDER_VERIFICATION.value, "Gati Electrical Lead"),
        ("CAPA-SECL-26-006", violation_objs[5].id, contractor_objs[3].id, m4.id, "Install Speed Limiters and Conduct Driver Safety Stand-Down", "Recalibrate telematics governors to 25 km/h and issue formal warnings to offending operators.", "MEDIUM", now - timedelta(days=2), ActionStatus.RESOLVED.value, "Singrauli Fleet Manager"),
        ("CAPA-ECL-26-007", violation_objs[6].id, contractor_objs[4].id, m5.id, "Emergency Recalibration of Underground Gas Detectors", "Deploy authorized Draeger technician to re-calibrate optical sensors with span gas.", "CRITICAL", now + timedelta(days=1), ActionStatus.ASSIGNED.value, "Brahmaputra Colliery Eng"),
        ("CAPA-ECL-26-008", violation_objs[7].id, contractor_objs[5].id, m1.id, "Commission Flame-Proof Mobile Dispenser Unit", "Replace open drum transfer with DGMS approved anti-static hose dispenser.", "HIGH", now - timedelta(days=3), ActionStatus.RESOLVED.value, "Kalinga Safety Officer"),
        ("CAPA-BCCL-26-009", violation_objs[8].id, contractor_objs[6].id, m2.id, "Terrace and Regrade Overburden Dump Slope", "Flatten upper crest slope using dragline re-handling to comply with 37.5 degree bench limit.", "HIGH", now + timedelta(days=5), ActionStatus.IN_PROGRESS.value, "Chotanagpur Earthmoving"),
        ("CAPA-SECL-26-010", violation_objs[9].id, contractor_objs[7].id, m3.id, "Desludge Oil-Water Separator and Replace Coalescer Filters", "Clean accumulated grease and submit NABL accredited water sample analysis.", "MEDIUM", now + timedelta(days=3), ActionStatus.ASSIGNED.value, "Coalfield Safety Tech"),
    ]

    action_objs = []
    for code, vid, cid, mid, title, desc, prio, due, st, asg in actions_data:
        ca = CorrectiveAction(
            action_code=code,
            violation_id=vid,
            contractor_id=cid,
            mine_id=mid,
            title=title,
            description=desc,
            priority=prio,
            due_date=due,
            status=st,
            assigned_to=asg,
            resolution_notes="Work completed and validated by on-site safety supervisor." if st in ["RESOLVED", "UNDER_VERIFICATION"] else None,
            resolved_at=now - timedelta(days=1) if st == "RESOLVED" else None,
            verified_by_id=u_manager.id if st == "RESOLVED" else None,
            verified_at=now - timedelta(days=1) if st == "RESOLVED" else None
        )
        db.add(ca)
        action_objs.append(ca)
    db.flush()

    # 13. COMPLIANCE RECORDS (Historical monthly mine benchmarks)
    for m in [m1, m2, m3, m4, m5]:
        for k in range(3):
            r_date = now - timedelta(days=k * 30)
            score_base = 82.0 if m.id == m1.id else (89.0 if m.id == m3.id else 76.0)
            cr = ComplianceRecord(
                mine_id=m.id,
                record_date=r_date,
                safety_score=score_base - (k * 2.0),
                environmental_score=score_base + 3.0,
                labour_score=score_base - 1.0,
                statutory_score=score_base + 5.0,
                overall_score=round(score_base + 1.25, 1),
                risk_level=RiskLevel.LOW.value if score_base > 80 else RiskLevel.MEDIUM.value,
                evaluation_breakdown={
                    "dgms_compliance_percent": 92.5,
                    "cpcb_water_air_index": 88.0,
                    "pme_coverage_percent": 96.0 if score_base > 80 else 84.0
                }
            )
            db.add(cr)
    db.flush()

    # 14. ALERTS & ESCALATIONS
    alerts_data = [
        ("Critical Violation: Fire Seam Encroachment at Jharia", "Deccan Coal Infra encroached active fire zone without nitrogen inerting. Escalated to Corporate.", "CRITICAL_VIOLATION", "CRITICAL", 3, m2.id, contractor_objs[1].id, True),
        ("Statutory Document Expired: Environmental Clearance", "ABC Mining Services environmental water/air clearance expired 15 days ago.", "DOCUMENT_EXPIRY", "HIGH", 2, m1.id, c_abc.id, False),
        ("Overdue Corrective Action: Pit 4 Cryogenic Unit", "CAPA-BCCL-26-004 is overdue past compliance deadline.", "ACTION_OVERDUE", "CRITICAL", 3, m2.id, contractor_objs[1].id, True),
        ("Field Safety Deficiency: Low Berm Height on Sector 2B", "Inspection INSP-ECL-2026-001 flagged haul road berm violation requiring immediate action.", "COMPLIANCE_WARNING", "HIGH", 2, m1.id, c_abc.id, False),
        ("Worker Medical Expiry Alert (PME)", "3 active operators identified with expired Form O medical examinations at Rajmahal OCP.", "MEDICAL_FITNESS_EXPIRED", "HIGH", 1, m1.id, c_abc.id, False)
    ]
    for tit, msg, atype, sev, esc, mid, cid, is_esc in alerts_data:
        db.add(Alert(
            title=tit,
            message=msg,
            alert_type=atype,
            severity=sev,
            escalation_level=esc,
            mine_id=mid,
            contractor_id=cid,
            is_escalated=is_esc
        ))

    # 15. AI RISK PREDICTIONS
    ai_preds = [
        AIPrediction(
            target_type="MINE",
            target_id=m1.id,
            risk_score=72.5,
            risk_category="HIGH",
            confidence=0.93,
            contributing_factors=[
                "High contractor turnover and 3 active open violations in Sector 2B",
                "2 overdue statutory environmental compliance submissions",
                "Dust suppression system failures during high wind season"
            ],
            explanation="AI-Assisted Assessment indicates elevated operational risk primarily driven by contractor safety compliance deficits and ambient particulate violations.",
            is_anomaly=True,
            anomaly_details={"metric": "Particulate PM10 Surge", "deviation": "+3.1 Sigma above 6-month moving baseline"},
            recommended_actions=[
                "Direct contractor to deploy additional pressurized water bowsers",
                "Audit dumper operator medical records before morning shift dispatch",
                "Hold safety stand-down with ABC Mining project manager"
            ]
        ),
        AIPrediction(
            target_type="CONTRACTOR",
            target_id=c_abc.id,
            risk_score=68.0,
            risk_category="HIGH",
            confidence=0.91,
            contributing_factors=[
                "Multiple active open violations across haulage and labour fitness",
                "Expired environmental water discharge certification",
                "3 workers operating past medical re-certification due dates"
            ],
            explanation="Contractor risk index elevated due to recurring maintenance issues and non-renewal of mandatory environmental clearance.",
            is_anomaly=False,
            anomaly_details={},
            recommended_actions=[
                "Withhold 10% monthly running bill retention pending CAPA closure",
                "Mandate weekly senior safety officer site walk-through"
            ]
        ),
        AIPrediction(
            target_type="MINE",
            target_id=m3.id,
            risk_score=22.0,
            risk_category="LOW",
            confidence=0.96,
            contributing_factors=[
                "100% adherence to blastless continuous surface miner protocols",
                "Zero loss-time injury (LTI) over preceding 180 days",
                "Automated misting cannons and conveyor dust suppression active"
            ],
            explanation="Benchmark low-risk facility demonstrating exemplary adherence to DGMS and MoEFCC standards.",
            is_anomaly=False,
            anomaly_details={},
            recommended_actions=["Maintain scheduled preventive maintenance cadence"]
        )
    ]
    db.add_all(ai_preds)

    # 16. AUDIT TRAIL LOGS
    audit_logs = [
        AuditLog(username="system", role="SYSTEM", action="SYSTEM_INIT", entity="System", ip_address="127.0.0.1"),
        AuditLog(username="field_officer_amit", role="FIELD OFFICER", action="INSPECTION_SUBMITTED", entity="Inspection", entity_id=insp_demo.id, new_value={"status": "SUBMITTED", "score": 68.5}, ip_address="192.168.1.104"),
        AuditLog(username="field_officer_amit", role="FIELD OFFICER", action="GEO_EVIDENCE_UPLOADED", entity="GeoEvidence", new_value={"file": "evidence_berm_height_ramp_2b.jpg", "lat": 25.0494, "lng": 87.3833}, ip_address="192.168.1.104"),
        AuditLog(username="system", role="SYSTEM_AI", action="AI_RISK_EVALUATION", entity="AIPrediction", new_value={"risk_score": 78.4, "risk_category": "HIGH"}, ip_address="127.0.0.1"),
        AuditLog(username="mine_manager_rajmahal", role="MINE MANAGER", action="CORRECTIVE_ACTION_ASSIGNED", entity="CorrectiveAction", entity_id=action_objs[0].id, new_value={"assigned_to": "ABC Mining Services"}, ip_address="10.20.4.15"),
        AuditLog(username="corporate_officer", role="CORPORATE MANAGEMENT", action="CORPORATE_ESCALATION_ISSUED", entity="Alert", new_value={"escalation_level": 3, "reason": "Jharia Fire Seam Encroachment"}, ip_address="10.10.1.2")
    ]
    db.add_all(audit_logs)

    db.commit()
    print("Database seeding completed successfully!")
