import json
from sqlalchemy.orm import Session
from app.models import (
    Base, User, Institution, Challenge, ChallengeAnalysis, ChallengeSimilarity, ChallengeMatch,
    Project, Milestone, ActivityLog, IndustryPartner, CSRFunding, MentorshipOffer,
    TechTransfer, Notification, ProjectComment, FundingRequest, FundingContribution
)
from app.database import engine, SessionLocal
from app.services.ai_service import analyze_challenge_text, get_text_embedding
from app.services.priority_service import calculate_priority_score
from app.services.duplicate_service import find_similar_challenges, calculate_cosine_similarity
from app.services.matching_service import match_institutions_for_challenge
from app.services.auth_service import hash_password

INSTITUTIONS_SEED = [
    {
        "id": 1,
        "name": "Indian Institute of Technology (ISM) Dhanbad",
        "city": "Dhanbad",
        "state": "Jharkhand",
        "departments": ["Mining Engineering", "Environmental Science & Engineering", "Civil Engineering", "Computer Science"],
        "research_expertise": ["Mine Dust Suppression", "Coal Industrial Effluent Treatment", "Geospatial Mining Audit", "AI & Machine Learning", "Disaster Resilience"],
        "technologies": ["Hydrodynamic Modeling", "IoT Air Quality Sensors", "Drone Terrain Mapping", "Predictive Analytics"],
        "capabilities": ["Mine Safety Auditing", "Subsurface Drainage Simulation", "Disaster Emergency Response Systems"],
        "relevant_domains": ["Disaster Management", "Water Management", "Environment", "Infrastructure", "Public Safety"],
        "contact_email": "env@iitism.ac.in",
        "rating": 4.9
    },
    {
        "id": 2,
        "name": "National Institute of Technology Jamshedpur (NIT Jamshedpur)",
        "city": "Jamshedpur",
        "state": "Jharkhand",
        "departments": ["Civil Engineering", "Metallurgical & Materials Engineering", "Computer Applications", "Electrical Engineering"],
        "research_expertise": ["Industrial Effluent Treatment", "Heavy Metal Soil Remediation", "Bridge Structural Health", "Smart Traffic Management"],
        "technologies": ["GIS Mapping", "Satellite Image Analysis", "IoT Smart Grid", "Waste Water Treatment Automation"],
        "capabilities": ["Geospatial Hotspot Mapping", "Civic Asset Audit", "Industrial Water Auditing"],
        "relevant_domains": ["Disaster Management", "Environment", "Waste Management", "Infrastructure", "Public Safety"],
        "contact_email": "civil@nitjsr.ac.in",
        "rating": 4.8
    },
    {
        "id": 3,
        "name": "Birla Institute of Technology (BIT Mesra), Ranchi",
        "city": "Ranchi",
        "state": "Jharkhand",
        "departments": ["Remote Sensing & Geoinformatics", "Civil & Environmental Engineering", "Computer Science"],
        "research_expertise": ["Urban Waterlogging Simulation", "Remote Sensing & GIS", "Smart City Traffic Flow", "IoT Sensor Networks"],
        "technologies": ["Low-Cost Pollution Sensors", "Deep Learning Traffic Signals", "Micro-climate Simulation"],
        "capabilities": ["Real-Time Air Quality Monitoring", "Urban Drainage Flow Optimization"],
        "relevant_domains": ["Environment", "Infrastructure", "Water Management", "Public Safety"],
        "contact_email": "rs@bitmesra.ac.in",
        "rating": 4.9
    },
    {
        "id": 4,
        "name": "All India Institute of Medical Sciences (AIIMS) Deoghar",
        "city": "Deoghar",
        "state": "Jharkhand",
        "departments": ["Community Medicine", "Environmental Health", "Telemedicine Center"],
        "research_expertise": ["Rural Telemedicine", "Waterborne Disease Surveillance", "Public Health Analytics"],
        "technologies": ["Remote Patient Diagnostics", "Water Quality Probes", "Epidemic Early Warning AI"],
        "capabilities": ["Rural Health Auditing", "Waterborne Contamination Alert Systems"],
        "relevant_domains": ["Healthcare", "Water Management", "Public Safety"],
        "contact_email": "telemed@aiimsdeoghar.edu.in",
        "rating": 4.8
    },
    {
        "id": 5,
        "name": "Ranchi University R&D Division",
        "city": "Ranchi",
        "state": "Jharkhand",
        "departments": ["Environmental Science", "Botany & Tribal Forestry", "Geology"],
        "research_expertise": ["Forest Fire Detection", "Soil Conservation", "Tribal Community Solar Microgrids"],
        "technologies": ["Satellite Thermal Warning", "IoT Solar Inverters", "Bio-remediation"],
        "capabilities": ["Forest Fire Risk Mapping", "Rural Solar Electrification Audits"],
        "relevant_domains": ["Environment", "Infrastructure", "Waste Management"],
        "contact_email": "rd@ranchiuniversity.ac.in",
        "rating": 4.7
    },
    {
        "id": 6,
        "name": "Indian Institute of Information Technology (IIIT) Ranchi",
        "city": "Ranchi",
        "state": "Jharkhand",
        "departments": ["Computer Science & Engineering", "Smart City AI Lab"],
        "research_expertise": ["Smart Streetlight Management", "Computer Vision Pothole Detection", "AI Safety Analytics"],
        "technologies": ["Smart Streetlight Nodes", "Crowd Analytics Vision Models", "Drone Surveillance"],
        "capabilities": ["Smart Street Light Health Monitoring", "Neighborhood Crime Risk Mapping"],
        "relevant_domains": ["Public Safety", "Healthcare", "Environment", "Infrastructure"],
        "contact_email": "ai.lab@iiitranchi.ac.in",
        "rating": 4.8
    }
]

CHALLENGES_SEED_RAW = [
    {
        "id": "CIV-2026-001",
        "title": "Severe monsoon waterlogging near Main Road Overbridge, Ranchi",
        "description": "Subway and main roads under 4 feet of storm water. Commuters stranded near Ranchi station, health hazard due to sewage mixing with flood water.",
        "category": "Disaster Management",
        "subcategory": "Urban Flooding & Waterlogging",
        "location": "Main Road Overbridge, Ranchi",
        "district": "Ranchi",
        "state": "Jharkhand",
        "latitude": 23.3524,
        "longitude": 85.3242,
        "urgency_level": "CRITICAL",
        "status": "IN_PROGRESS",
        "media_files": [{"name": "ranchi_overbridge.jpg", "type": "IMAGE", "url": "/uploads/ranchi_overbridge.jpg"}]
    },
    {
        "id": "CIV-2026-002",
        "title": "Coal dust pollution & heavy soot along Katras corridor, Dhanbad",
        "description": "Coal trucks release heavy soot and particulate matter near residential schools causing severe air pollution.",
        "category": "Environment",
        "subcategory": "Air Quality & Mining Soot",
        "location": "Katras Railway Station Road",
        "district": "Dhanbad",
        "state": "Jharkhand",
        "latitude": 23.8050,
        "longitude": 86.2800,
        "urgency_level": "HIGH",
        "status": "ACCEPTED",
        "media_files": [{"name": "Jharia_Coal_Dust_Evidence.jpg", "type": "IMAGE", "url": "/uploads/Jharia_Coal_Dust_Evidence.jpg"}]
    },
    {
        "id": "CIV-2026-003",
        "title": "Broken streetlights and dark spots along NH33 corridor, Hazaribagh",
        "description": "Non-functional streetlights create severe nighttime safety hazards for female commuters and students.",
        "category": "Public Safety",
        "subcategory": "Municipal Infrastructure & Lighting",
        "location": "NH33 Bus Stand Corridor, Hazaribagh",
        "district": "Hazaribagh",
        "state": "Jharkhand",
        "latitude": 23.9950,
        "longitude": 85.3620,
        "urgency_level": "HIGH",
        "status": "PROTOTYPE",
        "media_files": []
    }
]

def seed_database(drop_first=False):
    db: Session = SessionLocal()
    try:
        if drop_first:
            print("--- CLEARING EXISTING TABLES ---")
            Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        # Check if users exist if not forcing drop
        if not drop_first and db.query(User).first():
            print("--- DATABASE ALREADY POPULATED ---")
            return


        print("--- SEEDING DEMO USER ACCOUNTS ---")
        citizen_user = User(
            email="citizen@civiora.gov.in",
            hashed_password=hash_password("citizen123"),
            name="Citizen Reporter (Ranchi)",
            role="CITIZEN",
            account_status="ACTIVE",
            auth_mode="DEMO",
            institution_id=None
        )
        univ_user = User(
            email="iitm@civiora.gov.in",
            hashed_password=hash_password("univ123"),
            name="IIT (ISM) Dhanbad Lead Lab",
            role="UNIVERSITY",
            account_status="ACTIVE",
            auth_mode="DEMO",
            institution_id=1
        )
        admin_user = User(
            email="admin@civiora.gov.in",
            hashed_password=hash_password("admin123"),
            name="Jharkhand Municipal Command Admin",
            role="GOVERNMENT_ADMIN",
            account_status="ACTIVE",
            auth_mode="DEMO",
            institution_id=None
        )
        industry_user = User(
            email="industry@civiora.gov.in",
            hashed_password=hash_password("industry123"),
            name="Tata Steel & Adityapur MSME Consortium",
            role="INDUSTRY_PARTNER",
            account_status="ACTIVE",
            auth_mode="DEMO",
            institution_id=None
        )
        univ_user2 = User(
            email="bit@civiora.gov.in",
            hashed_password=hash_password("univ123"),
            name="BIT Mesra R&D Cell",
            role="UNIVERSITY",
            account_status="ACTIVE",
            auth_mode="DEMO",
            institution_id=2
        )
        db.add_all([citizen_user, univ_user, univ_user2, admin_user, industry_user])
        db.commit()
        print("[PASS] Demo user accounts seeded successfully!")

        print("--- SEEDING INSTITUTION PROFILES ---")
        for inst_data in INSTITUTIONS_SEED:
            inst = Institution(
                id=inst_data["id"],
                name=inst_data["name"],
                city=inst_data["city"],
                state=inst_data["state"],
                departments=json.dumps(inst_data["departments"]),
                research_expertise=json.dumps(inst_data["research_expertise"]),
                technologies=json.dumps(inst_data["technologies"]),
                capabilities=json.dumps(inst_data["capabilities"]),
                relevant_domains=json.dumps(inst_data["relevant_domains"]),
                contact_email=inst_data["contact_email"],
                rating=inst_data["rating"]
            )
            db.add(inst)
        db.commit()
        print(f"[PASS] {len(INSTITUTIONS_SEED)} Jharkhand Institutions seeded successfully!")

        print("--- PROCESSING AND SEEDING CHALLENGES WITH AI ENGINE ---")
        challenge_objects = []
        for raw in CHALLENGES_SEED_RAW:
            ch = Challenge(
                id=raw["id"],
                citizen_id=1,
                title=raw["title"],
                description=raw["description"],
                category=raw["category"],
                subcategory=raw["subcategory"],
                location=raw["location"],
                district=raw["district"],
                state=raw["state"],
                latitude=raw["latitude"],
                longitude=raw["longitude"],
                urgency_level=raw["urgency_level"],
                status=raw["status"],
                media_files=json.dumps(raw["media_files"]) if raw.get("media_files") else None
            )
            db.add(ch)
            challenge_objects.append(ch)
        db.commit()

        # Run AI analysis & vector embeddings for every seeded challenge
        for ch in challenge_objects:
            full_text = f"{ch.title}. {ch.description}. Location: {ch.location}, {ch.district}, {ch.state}."
            analysis_dict = analyze_challenge_text(full_text, ch.urgency_level)
            prio_dict = calculate_priority_score(
                analysis_dict["severity_score"],
                analysis_dict["urgency_score"],
                analysis_dict["impact_score"]
            )
            embedding_vec = get_text_embedding(full_text)

            analysis_obj = ChallengeAnalysis(
                challenge_id=ch.id,
                predicted_category=analysis_dict["predicted_category"],
                subcategory=analysis_dict["subcategory"],
                keywords=json.dumps(analysis_dict["keywords"]),
                affected_stakeholders=json.dumps(analysis_dict["affected_stakeholders"]),
                severity_score=analysis_dict["severity_score"],
                urgency_score=analysis_dict["urgency_score"],
                impact_score=analysis_dict["impact_score"],
                recurrence_score=prio_dict["recurrence_score"],
                priority_score=prio_dict["priority_score"],
                priority_level=prio_dict["priority_level"],
                priority_reason=prio_dict["priority_reason"],
                suggested_impact_areas=json.dumps(analysis_dict["suggested_impact_areas"])
            )
            db.add(analysis_obj)
        db.commit()
        print(f"[PASS] {len(challenge_objects)} Challenges analyzed & embedded in SQLite!")

        print("--- COMPUTING SIMILARITY PAIRS AND INSTITUTION MATCHES ---")
        all_challenges = db.query(Challenge).all()
        for ch in all_challenges:
            full_text = f"{ch.title}. {ch.description}."
            similar_list = find_similar_challenges(ch.id, full_text, db, top_k=3)
            for sim in similar_list:
                db.add(ChallengeSimilarity(
                    challenge_id=ch.id,
                    similar_challenge_id=sim["id"],
                    similarity_score=sim["similarity_score"],
                    classification=sim["classification"]
                ))

            matched_insts = match_institutions_for_challenge(ch.title, ch.description, ch.category, db)
            for match in matched_insts:
                db.add(ChallengeMatch(
                    challenge_id=ch.id,
                    institution_id=match["institution_id"],
                    match_percentage=match["match_percentage"],
                    relevant_expertise=json.dumps(match.get("relevant_expertise", [])),
                    explanation=match["explanation"],
                    status="ACCEPTED" if ch.status in ["ACCEPTED", "IN_PROGRESS", "PROTOTYPE", "RESOLVED"] and match["institution_id"] == 1 else "RECOMMENDED"
                ))
        db.commit()

        print("--- SEEDING SOLUTION PROJECTS & MILESTONES ---")
        accepted_challenges = db.query(Challenge).filter(Challenge.status.in_(["ACCEPTED", "IN_PROGRESS", "PROTOTYPE", "RESOLVED"])).all()
        for idx, ch in enumerate(accepted_challenges, 1):
            proj_id = f"PRJ-2026-00{idx}"
            proj = Project(
                id=proj_id,
                project_name=f"Solution R&D: {ch.title[:45]}...",
                challenge_id=ch.id,
                institution_id=1, # IIT (ISM) Dhanbad
                description=f"Applied research and engineering solution deployment for {ch.title}",
                status=ch.status,
                progress=40.0 if ch.status == "IN_PROGRESS" else (100.0 if ch.status == "RESOLVED" else 20.0)
            )
            db.add(proj)
            db.flush()
            ch.project_id = proj.id

            m1 = Milestone(project_id=proj.id, title="Requirement & Site Survey", description="Field survey in Jharkhand district", is_completed=True)
            m2 = Milestone(project_id=proj.id, title="Solution Design & Architecture", description="Technical design & resource allocation", is_completed=ch.status in ["IN_PROGRESS", "PROTOTYPE", "RESOLVED"])
            m3 = Milestone(project_id=proj.id, title="Prototype Development", description="Build hardware/software solution prototype", is_completed=ch.status in ["PROTOTYPE", "RESOLVED"])
            m4 = Milestone(project_id=proj.id, title="Pilot Testing & Validation", description="Deploy pilot test in Jharkhand target site", is_completed=ch.status == "RESOLVED")
            m5 = Milestone(project_id=proj.id, title="Full Deployment & Handover", description="Handover operational system to municipal authority", is_completed=ch.status == "RESOLVED")
            db.add_all([m1, m2, m3, m4, m5])

        db.commit()

        print("--- SEEDING AUDIT LOGS ---")
        log1 = ActivityLog(challenge_id="CIV-2026-001", project_id="PRJ-2026-001", action="IIT (ISM) Dhanbad accepted challenge CIV-2026-001 and instantiated project PRJ-2026-001", performed_by="IIT (ISM) Dhanbad")
        log2 = ActivityLog(challenge_id="CIV-2026-003", project_id="PRJ-2026-002", action="Milestone 'Solution Design' marked completed by IIT (ISM) Dhanbad", performed_by="IIT (ISM) Dhanbad")
        db.add_all([log1, log2])
        db.commit()

        print("--- SEEDING INDUSTRY PARTNERS & CSR MODULE ---")
        ind1 = IndustryPartner(
            name="Tata Steel Foundation (CSR)",
            entity_type="CSR_FOUNDATION",
            sector="Infrastructure & Environment",
            contact_email="csr@tatasteel.com",
            website="https://www.tatasteelfoundation.org",
            csr_budget=150.0,
            focus_domains=json.dumps(["Disaster Management", "Infrastructure", "Environment"]),
            mentorship_available=True
        )
        ind2 = IndustryPartner(
            name="Adityapur MSME Consortium",
            entity_type="MSME",
            sector="Manufacturing & IoT Sensors",
            contact_email="innovate@adityapur-msme.org",
            website="https://adityapur-msme.org",
            csr_budget=45.0,
            focus_domains=json.dumps(["Water Management", "Waste Management", "Public Safety"]),
            mentorship_available=True
        )
        ind3 = IndustryPartner(
            name="CleanTech Solutions Pvt Ltd",
            entity_type="STARTUP",
            sector="CleanTech & Renewable Energy",
            contact_email="contact@cleantech.in",
            website="https://cleantech.in",
            csr_budget=25.0,
            focus_domains=json.dumps(["Environment", "Water Management"]),
            mentorship_available=True
        )
        db.add_all([ind1, ind2, ind3])
        db.commit()

        # Seed CSR Funding, Mentorship, Tech Transfer, Comments & Notifications
        csr1 = CSRFunding(
            project_id="PRJ-2026-001",
            partner_id=ind1.id,
            amount_in_lakhs=18.5,
            purpose="Sponsorship for automated waterlogging sensors & IoT telemetry hardware pilot deployment",
            status="APPROVED"
        )
        mentor1 = MentorshipOffer(
            project_id="PRJ-2026-001",
            partner_id=ind2.id,
            mentor_name="Dr. Rajesh Verma",
            expertise_domain="Embedded Systems & Municipal IoT Sensors",
            contact_email="r.verma@adityapur-msme.org",
            status="ACTIVE"
        )
        tech1 = TechTransfer(
            project_id="PRJ-2026-001",
            partner_id=ind3.id,
            ip_type="PILOT_DEPLOYMENT",
            licensing_terms="Non-exclusive municipal licensing for smart drainage alert system across Ranchi district",
            status="AGREEMENT_SIGNED"
        )

        freq1 = FundingRequest(
            project_id="PRJ-2026-001",
            partner_id=ind1.id,
            minimum_required=15.0,
            maximum_required=18.5,
            justification="₹15–18.5 Lakhs is required for procurement of 12 ultrasonic water level sensors, IoT cellular telemetry gateways, field deployment, and pilot testing across urban flood zones in Ranchi.",
            supporting_documents_url="/docs/ranchi_waterlogging_budget_breakdown.pdf",
            requested_amount=18.5,
            approved_amount=18.5,
            purpose="Sponsorship for automated waterlogging sensors & IoT telemetry hardware pilot deployment",
            description="Procurement and deployment of 12 ultrasonic water level sensors and cellular gateway units across Ranchi Overbridge subway.",
            expected_outcome="Real-time water level alerts with 99.2% accuracy sent directly to municipal flood response teams.",
            status="FULLY_FUNDED"
        )
        db.add(freq1)
        db.flush()

        fc1 = FundingContribution(
            funding_request_id=freq1.id,
            project_id="PRJ-2026-001",
            partner_id=ind1.id,
            contribution_amount=11.1,
            share_percentage=60.0,
            status="APPROVED"
        )
        fc2 = FundingContribution(
            funding_request_id=freq1.id,
            project_id="PRJ-2026-001",
            partner_id=ind2.id,
            contribution_amount=7.4,
            share_percentage=40.0,
            status="APPROVED"
        )

        freq2 = FundingRequest(
            project_id="PRJ-2026-002",
            partner_id=ind2.id,
            minimum_required=10.0,
            maximum_required=12.0,
            justification="₹10–12 Lakhs is required for electrostatic misting nozzle fabrication, sensor pilot assembly, and air quality telemetry units in coal transport corridors in Katras.",
            supporting_documents_url="/docs/dust_suppression_cost_estimate.pdf",
            requested_amount=12.0,
            approved_amount=6.0,
            purpose="Industrial coal dust suppression spray nozzle & sensor pilot unit",
            description="Development of localized electrostatic misting nozzles for coal transport corridors in Katras, Dhanbad.",
            expected_outcome="50% reduction in particulate matter (PM2.5/PM10) along residential school corridors.",
            status="PARTIALLY_FUNDED"
        )
        db.add(freq2)
        db.flush()

        fc3 = FundingContribution(
            funding_request_id=freq2.id,
            project_id="PRJ-2026-002",
            partner_id=ind2.id,
            contribution_amount=6.0,
            share_percentage=50.0,
            status="APPROVED"
        )

        db.add_all([csr1, mentor1, tech1, fc1, fc2, fc3])

        # Project Comments
        c1 = ProjectComment(
            project_id="PRJ-2026-001",
            author_name="Ranchi Municipal Administrator",
            author_role="GOVERNMENT_ADMIN",
            content="Field inspection completed near Main Road Overbridge. Waterlogging depth sensors deployed. Requesting update on pilot test completion date."
        )
        c2 = ProjectComment(
            project_id="PRJ-2026-001",
            author_name="Prof. A. K. Sharma (IIT ISM Dhanbad)",
            author_role="UNIVERSITY",
            content="Sensors & telemetry hub successfully calibrated with 99.2% accuracy. Telemetry feeds linked to municipal GIS command dashboard."
        )
        c3 = ProjectComment(
            project_id="PRJ-2026-001",
            author_name="Tata Steel CSR Lead",
            author_role="INDUSTRY_PARTNER",
            content="Tata Steel CSR Foundation has sanctioned ₹18.5 Lakhs funding to expand sensor coverage to 5 additional subways in Ranchi."
        )
        db.add_all([c1, c2, c3])

        # Notifications
        n1 = Notification(
            user_role="ALL",
            title="CIVIORA Platform Finalized",
            message="Civic challenge intake, AI priority engine, university matching, and industry CSR portal are fully operational.",
            link="/explorer"
        )
        n2 = Notification(
            user_role="UNIVERSITY",
            title="CSR Funding Sanctioned",
            message="Tata Steel Foundation approved ₹18.5 Lakhs CSR funding for PRJ-2026-001",
            link="/projects/PRJ-2026-001"
        )
        n3 = Notification(
            user_role="GOVERNMENT_ADMIN",
            title="New Challenge Logged by Ranchi Urban Local Body",
            message="Urban Local Body logged high-priority drainage challenge CIV-2026-001.",
            link="/explorer/CIV-2026-001"
        )
        db.add_all([n1, n2, n3])
        db.commit()

        # Seed Social Engagement Interactions (Likes, Reposts, Shares, Comments)
        from app.models import ChallengeLike, ChallengeRepost, ChallengeShare, ChallengeComment
        cit = db.query(User).filter(User.role == "CITIZEN").first()
        univ_u = db.query(User).filter(User.role == "UNIVERSITY").first()
        admin_u = db.query(User).filter(User.role == "GOVERNMENT_ADMIN").first()

        if cit and univ_u:
            # Likes
            db.add(ChallengeLike(challenge_id="CIV-2026-001", user_id=cit.id))
            db.add(ChallengeLike(challenge_id="CIV-2026-001", user_id=univ_u.id))
            if admin_u:
                db.add(ChallengeLike(challenge_id="CIV-2026-001", user_id=admin_u.id))

            # Repost
            db.add(ChallengeRepost(challenge_id="CIV-2026-001", user_id=cit.id, user_name=cit.name))

            # Share
            db.add(ChallengeShare(challenge_id="CIV-2026-001", user_id=cit.id))

            # Comments
            comm1 = ChallengeComment(
                challenge_id="CIV-2026-001",
                user_id=cit.id,
                author_name=cit.name,
                author_role="CITIZEN",
                content="This waterlogging has been blocking emergency ambulances near Main Road Overbridge for 3 consecutive days!"
            )
            comm2 = ChallengeComment(
                challenge_id="CIV-2026-001",
                user_id=univ_u.id,
                author_name="IIT (ISM) Dhanbad R&D",
                author_role="UNIVERSITY",
                content="Our IoT sensor team has deployed automated water-level telemetry sensors to log live depth readings."
            )
            db.add_all([comm1, comm2])
            db.commit()

            # Recalculate Priority with Social Boost
            from app.routers.challenges import recalculate_challenge_priority
            ch1 = db.query(Challenge).filter(Challenge.id == "CIV-2026-001").first()
            if ch1:
                recalculate_challenge_priority(ch1, db)

            # Seed CIVI-CONNECT Unified Project Collaboration Chat
            from app.models import ProjectConversation, ProjectParticipant, ProjectMessage
            conv = ProjectConversation(project_id="PRJ-2026-001")
            db.add(conv)
            db.commit()
            db.refresh(conv)


            # Participants
            p1 = ProjectParticipant(conversation_id=conv.id, user_id=cit.id, role="CITIZEN")
            p2 = ProjectParticipant(conversation_id=conv.id, user_id=univ_u.id, role="UNIVERSITY")
            if admin_u:
                p3 = ProjectParticipant(conversation_id=conv.id, user_id=admin_u.id, role="GOVERNMENT")
                db.add(p3)
            db.add_all([p1, p2])
            db.commit()

            # Messages
            m1 = ProjectMessage(
                conversation_id=conv.id,
                sender_id=None,
                sender_name="SYSTEM",
                sender_role="SYSTEM",
                message="IIT (ISM) Dhanbad accepted challenge CIV-2026-001. Solution Project PRJ-2026-001 created.",
                is_system_message=True
            )
            m2 = ProjectMessage(
                conversation_id=conv.id,
                sender_id=None,
                sender_name="SYSTEM",
                sender_role="SYSTEM",
                message="Adityapur MSME Consortium committed ₹3 Lakhs to this project.",
                is_system_message=True
            )
            m3 = ProjectMessage(
                conversation_id=conv.id,
                sender_id=cit.id,
                sender_name=cit.name,
                sender_role="CITIZEN",
                message="The water level is usually highest between 6–9 PM near the railway station overbridge."
            )
            m4 = ProjectMessage(
                conversation_id=conv.id,
                sender_id=univ_u.id,
                sender_name="IIT (ISM) Dhanbad",
                sender_role="UNIVERSITY",
                message="We have completed the initial site survey and are preparing the prototype sensor telemetry hub."
            )
            m5 = ProjectMessage(
                conversation_id=conv.id,
                sender_id=univ_u.id,
                sender_name="Tata Steel Foundation",
                sender_role="MSME / INDUSTRY",
                message="The first funding tranche of ₹18.5 Lakhs has been approved."
            )
            m6 = ProjectMessage(
                conversation_id=conv.id,
                sender_id=admin_u.id if admin_u else None,
                sender_name="Jharkhand Government Admin",
                sender_role="GOVERNMENT",
                message="Please share the expected pilot deployment date."
            )
            m7 = ProjectMessage(
                conversation_id=conv.id,
                sender_id=univ_u.id,
                sender_name="IIT (ISM) Dhanbad",
                sender_role="UNIVERSITY",
                message="Pilot testing is scheduled for next week with live IoT sensor feeds."
            )
            m8 = ProjectMessage(
                conversation_id=conv.id,
                sender_id=None,
                sender_name="SYSTEM",
                sender_role="SYSTEM",
                message="Project status moved from Prototype → Pilot Testing",
                is_system_message=True
            )
            db.add_all([m1, m2, m3, m4, m5, m6, m7, m8])
            db.commit()

        print("====================================================")
        print("CIVIORA DATABASE SEEDED SUCCESSFULLY WITH INDUSTRY & NOTIFICATION MODULES & CIVI-CONNECT!")
        print("====================================================")


    except Exception as e:
        print(f"SEED ERROR: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

def seed_database_if_empty():
    seed_database(drop_first=False)

if __name__ == "__main__":
    seed_database(drop_first=True)


