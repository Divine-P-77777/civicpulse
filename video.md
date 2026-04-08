# CivicPulse Live Interaction Video — Complete Script

This document provides the full script, scenarios, and technical flow for creating a high-impact demonstration video of CivicPulse, featuring 3 real scenarios grounded in the indexed knowledge base.

---

## Knowledge Base Documents Referenced

The following documents are indexed in the CivicPulse RAG system and will be referenced in the scenarios:

| Document ID | Description |
|-------------|-------------|
| `Navtej-Johar-v1052` | Supreme Court judgment decriminalizing Section 377 |
| `Naz-Foundation-v-Govt-of-NCT235` | Delhi High Court judgment on dignity and equality |
| `THE_WILD_LIFE__ACT_1972310` | Wildlife Protection Act 1972 |
| `FOREST CONSERVATION ACT226` | Forest Conservation Act provisions |
| `THE_Code_on_Social_Security_2020_Act540` | Social security and employment rights |
| `constitution_page-1-100` | Constitution Articles 1-100 (Fundamental Rights) |
| `constitution_page-101-201` | Constitution Articles 101-201 |
| `constitution_page-203-301325` | Constitution Articles 203-301 |
| `Constitutions_Page-302-402279` | Constitution Articles 302-402 |

---

## Scene 1: Home Page & Vision

**Duration**: 0:00 - 0:20

**Action**: Smooth scroll through the homepage, showing the hero section and key features.

**Narrator Script**:
> "Most people feel powerless against complex legal systems. CivicPulse changes that. An AI-powered legal assistant that understands your rights as clearly as a lawyer, but talks as simply as a friend."

---

## Scenario 1: Live Mode → RTI Application (Government Job Rejection)

**Duration**: 0:20 - 1:45

**Context**: A user wants to know why their government job application was rejected and needs to file an RTI.

**Mode**: Live Mode (Voice Interaction)

**Knowledge Base Used**: `constitution_page-1-100` (Article 19), `THE_Code_on_Social_Security_2020_Act540`

---

### Detailed Dialogue

**[SCREEN: Live Mode open, glowing orb in idle state]**

User taps the blue connect button. Orb animates to "Listening..." with blue pulse.

**USER (speaks)**:
> "I applied for a government post last month. My application was rejected without any reason given. Can I find out why?"

**[Orb shifts to "Thinking..." — amber pulse]**

**AI (voice response — following live_prompt.txt rules: 2 sentences max, authoritative tone)**:
> "Yes, absolutely. Under Article 19(1)(a) of the Constitution and the RTI Act 2005, you have the right to seek information from any public authority about the reasons for rejection, the selection criteria used, and the marks obtained by selected candidates."

**USER (speaks)**:
> "Can you help me file an RTI for this?"

**AI (voice response)**:
> "Certainly. I can draft an RTI application requesting the specific reasons for rejection and the selection criteria. What was the name of the department and the post you applied for?"

**USER (speaks)**:
> "It was the Staff Selection Commission, Junior Assistant post. I applied in January 2026."

**AI (voice response)**:
> "Noted. SSC Junior Assistant, January 2026 application. What is your full name for the RTI application?"

**USER (speaks)**:
> "Rahul Sharma."

**AI (voice response)**:
> "Thank you, Rahul. Shall I use your saved profile details for the address and contact, or would you prefer to enter them manually?"

**USER (speaks)**:
> "Use my saved profile."

**[Draft card appears on screen with emerald glow]**

**AI (voice response)**:
> "I have prepared an RTI Application from Rahul Sharma to the Staff Selection Commission regarding the Junior Assistant rejection. Please tap the Create Draft button below."

**[Screen shows draft card]**
```
┌─────────────────────────────────────────┐
│  Ready to draft: RTI Application        │
│                                         │
│  [Continue to Create Draft →]           │
│  [Edit Details]                         │
└─────────────────────────────────────────┘
```

**[User taps "Continue to Create Draft" → transitions to Draft Creation page]**

**[SCREEN: Draft Creation page with streaming generation]**

The draft auto-generates with:
- Topic pre-filled: "RTI application for SSC Junior Assistant rejection reasons"
- Type: RTI Application
- User profile auto-filled (name, address, contact, email)

**[Final document shows in editor — user can edit, copy, or export as PDF]**

---

### Generated RTI Document Preview

```markdown
# RTI APPLICATION

**Reference No.**: REF/2026/047
**Date**: April 8, 2026

## FROM:
Rahul Sharma
[User Address from Profile]
Contact: [User Phone]
Email: [User Email]

## TO:
The Central Public Information Officer (CPIO)
Staff Selection Commission
Block No. 12, CGO Complex, Lodhi Road
New Delhi - 110003

## SUBJECT:
Request for Information under RTI Act 2005 regarding Junior Assistant Application Rejection

## FACTS OF THE CASE:
1. I, Rahul Sharma, applied for the post of Junior Assistant through the Staff Selection Commission in January 2026.
2. My application was rejected without providing any reasons for such rejection.
3. I seek information regarding the grounds on which my application was rejected.

## INFORMATION SOUGHT:
1. The specific reasons for rejection of my application for the Junior Assistant post.
2. The selection criteria and eligibility requirements for the said post.
3. The marks obtained by me in the screening process, if applicable.
4. The cut-off marks for shortlisting candidates for the interview stage.

## LEGAL GROUNDS:
- Article 19(1)(a) of the Constitution of India (Right to Information)
- Section 6 of the Right to Information Act, 2005

## PRAYER:
I request you to provide the above information within 30 days as mandated under Section 7(1) of the RTI Act, 2005.

**Signature:**
_______________________
Rahul Sharma
Date: April 8, 2026
```

---

## Scenario 2: Live Mode — Forest/Tribal Land Rights (Serious Civic Issue)

**Duration**: 1:45 - 3:15

**Context**: A tribal community member's land is being acquired for a wildlife sanctuary without consent.

**Mode**: Live Mode (Voice Interaction)

**Knowledge Base Used**: `THE_WILD_LIFE__ACT_1972310`, `FOREST CONSERVATION ACT226`, `constitution_page-101-201`

---

### Detailed Dialogue

**[SCREEN: Live Mode, user speaks with urgency]**

**USER (speaks)**:
> "The forest department is taking our village land for a wildlife sanctuary. They didn't ask us or hold any meeting. What are our rights?"

**[Orb shifts to "Thinking..." then "Speaking..."]**

**AI (voice response)**:
> "This is a serious matter. Under the Forest Rights Act 2006 and the Wildlife Protection Act 1972, tribal communities have protected rights over forest land they have traditionally occupied. The government cannot acquire your land without Gram Sabha consent — that is a legal requirement, not optional."

**USER (speaks)**:
> "They said it's for national interest, so they can take it."

**AI (voice response)**:
> "Even for national interest, the Forest Conservation Act requires prior approval and proper rehabilitation. The Supreme Court has held that tribal rights cannot be bypassed. You have grounds to challenge this acquisition."

**USER (speaks)**:
> "What can I do? Who do I complain to?"

**AI (voice response)**:
> "You have three options. First, file a written complaint with the District Collector citing violation of the Forest Rights Act. Second, approach the State Tribal Welfare Department. Third, you may file a writ petition in the High Court under Article 226 for violation of your fundamental rights."

**USER (speaks)**:
> "Can you draft a complaint to the District Collector for me?"

**AI (voice response)**:
> "Yes, I can draft a formal complaint. What is your name and the name of your village?"

**USER (speaks)**:
> "My name is Lakshmi Devi. Village is Chandpur, in Madhya Pradesh."

**AI (voice response)**:
> "Noted, Lakshmi Devi from Chandpur, Madhya Pradesh. When did you first receive notice about the land acquisition?"

**USER (speaks)**:
> "About two weeks ago. They came on March 25th, 2026."

**AI (voice response)**:
> "Understood. Shall I use your saved profile details for the address and contact, or enter manually?"

**USER (speaks)**:
> "Enter manually, I don't have a profile saved."

**AI (voice response)**:
> "What is your full address and contact number?"

**USER (speaks)**:
> "House number 42, Chandpur Village, Dindori District, Madhya Pradesh, 481880. My phone is 94251XXXXX."

**AI (voice response)**:
> "Thank you. I have prepared a Complaint Letter from Lakshmi Devi to the District Collector, Dindori, regarding illegal forest land acquisition. Please tap the Create Draft button below."

**[Draft card appears]**
```
┌─────────────────────────────────────────┐
│  Ready to draft: Complaint              │
│                                         │
│  [Continue to Create Draft →]           │
│  [Edit Details]                         │
└─────────────────────────────────────────┘
```

**[User taps → Draft Creation page opens with auto-generated complaint]**

---

### Generated Complaint Document Preview

```markdown
# FORMAL COMPLAINT

**Reference No.**: REF/2026/048
**Date**: April 8, 2026

## FROM:
Lakshmi Devi
House No. 42, Chandpur Village
Dindori District, Madhya Pradesh - 481880
Contact: 94251XXXXX

## TO:
The District Collector
Dindori District
Madhya Pradesh

## SUBJECT:
Urgent Complaint Against Illegal Forest Land Acquisition Without Gram Sabha Consent

## FACTS OF THE CASE:
1. I, Lakshmi Devi, am a resident of Chandpur Village, Dindori District, and belong to a Scheduled Tribe community that has traditionally occupied and depended on the forest land in question for generations.
2. On March 25, 2026, officials from the Forest Department visited our village and informed us that our land is being acquired for a wildlife sanctuary under the Wildlife Protection Act, 1972.
3. No Gram Sabha meeting was convened, no consent was obtained from the village community, and no rehabilitation or compensation package was discussed.
4. The proposed acquisition affects approximately 200 families who depend on this land for their livelihood.

## LEGAL GROUNDS:
1. **The Scheduled Tribes and Other Traditional Forest Dwellers (Recognition of Forest Rights) Act, 2006** — Section 3 recognizes the right of forest-dwelling communities to hold and live in forest land. Section 6 mandates Gram Sabha consent before any relocation.
2. **The Wildlife Protection Act, 1972** — Section 18A requires consultation with Gram Sabha before declaring a sanctuary in Scheduled Areas.
3. **The Forest Conservation Act, 1980** — Prior approval from the Central Government is mandatory before diverting forest land.
4. **Article 21 of the Constitution of India** — Right to life includes the right to livelihood, which is being threatened.

## RELIEF SOUGHT:
1. An immediate stay on the land acquisition process until all legal requirements, including Gram Sabha consent, are fulfilled.
2. A proper survey of the affected families and their traditional rights over the land.
3. Implementation of the rehabilitation and resettlement provisions under the Forest Rights Act, 2006.
4. A written response within 15 days regarding the status of this complaint.

## PRAYER:
I request you to urgently intervene and prevent the illegal dispossession of tribal families from their ancestral land. Failure to address this may compel us to seek judicial remedies from the Hon'ble High Court.

**Signature:**
_______________________
Lakshmi Devi
Date: April 8, 2026
```

---

## Scenario 3: Chat Mode — LGBTQ+ Employment Discrimination

**Duration**: 3:15 - 4:45

**Context**: A user uploads an employment contract with a discriminatory termination clause and asks about their rights.

**Mode**: Chat Mode (Document Upload + Text Conversation)

**Knowledge Base Used**: `Navtej-Johar-v1052`, `Naz-Foundation-v-Govt-of-NCT235`, `constitution_page-203-301325`

---

### Detailed Dialogue

**[SCREEN: Chat Mode welcome screen]**

User sees quick prompts and clicks "Create a Draft" or uploads a document directly.

**[User uploads PDF: employment_contract.pdf]**

**[Processing animation shows: "Analyzing document..."]**

**[Document processes — Risk indicators appear on clauses]**

**[One clause highlighted in RED]**

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ HIGH RISK CLAUSE DETECTED                                │
│                                                             │
│  "Employment may be terminated at will based on conduct     │
│   deemed contrary to company values or culture."            │
│                                                             │
│  Risk Level: RED                                            │
│  Reason: Vague, subjective language that can be used for    │
│          discriminatory termination without accountability. │
└─────────────────────────────────────────────────────────────┘
```

**USER (types)**:
> "My employer fired me last week citing 'conduct issues' but I believe it's because of my identity as a transgender person. What does the law say?"

**AI (text response — following system_prompt.txt: warm, empathetic, 3-5 sentences)**:
> "I'm so sorry you're going through this. What happened to you is not okay, and the law is on your side. The Supreme Court's landmark judgment in **Navtej Singh Johar v. Union of India (2018)** affirmed that LGBTQ+ individuals have full constitutional rights to dignity, equality, and non-discrimination under Articles 14, 15, 19, and 21 of the Constitution. The vague 'conduct' clause in your contract is a red flag — courts have struck down terminations that use subjective moral language to mask discriminatory intent. The **Naz Foundation v. Government of NCT of Delhi** case further established that the state cannot use morality as a basis to deny fundamental rights."

**USER (types)**:
> "What legal action can I take?"

**AI (text response)**:
> "You have several options. You can file a complaint with the National Human Rights Commission for violation of your constitutional rights. You can also approach a labor court for wrongful termination under the Industrial Disputes Act, 1947. Additionally, you may send a legal notice to your employer demanding reinstatement and compensation for discrimination."

**USER (types)**:
> "Can you draft a legal notice for me?"

**AI (text response)**:
> "Absolutely. I'll draft a legal notice citing the Navtej Johar judgment and wrongful termination grounds. What is your full name, and what was your designation at the company?"

**USER (types)**:
> "My name is Ananya Roy. I was a Senior Marketing Executive at TechVista Solutions Pvt Ltd in Bangalore."

**AI (text response)**:
> "Noted, Ananya Roy, Senior Marketing Executive at TechVista Solutions, Bangalore. When were you terminated, and did you receive any termination letter or email?"

**USER (types)**:
> "I was terminated on March 28, 2026. They sent an email saying 'conduct not aligned with company values' but gave no specific incident."

**AI (text response)**:
> "That's helpful. The vague reason strengthens your case. What is your contact number and current address for the legal notice?"

**USER (types)**:
> "Phone: 98765XXXXX. Address: 15, Green Park Apartments, Koramangala, Bangalore - 560034."

**AI (text response)**:
> "Thank you, Ananya. I have all the details needed. Shall I use your saved profile details for any additional information, or proceed with what you've provided?"

**USER (types)**:
> "Proceed with this."

**[Draft card appears in chat]**

**AI (text response)**:
> "I have prepared a Legal Notice from Ananya Roy to TechVista Solutions Pvt Ltd regarding discriminatory termination. Click below to generate the full document."

```
┌─────────────────────────────────────────┐
│  📄 Ready to draft: Legal Notice        │
│                                         │
│  [Create Draft →]                       │
└─────────────────────────────────────────┘
```

**[User clicks → Draft Creation page opens with auto-generated legal notice]**

---

### Generated Legal Notice Document Preview

```markdown
# LEGAL NOTICE

**Reference No.**: REF/2026/049
**Date**: April 8, 2026

## FROM:
Ananya Roy
15, Green Park Apartments
Koramangala, Bangalore - 560034
Contact: 98765XXXXX

## TO:
TechVista Solutions Pvt Ltd
[Company Address - to be verified]
Bangalore, Karnataka

## SUBJECT:
LEGAL NOTICE FOR WRONGFUL TERMINATION AND DISCRIMINATION

## FACTS OF THE CASE:
1. I, Ananya Roy, was employed as a Senior Marketing Executive at TechVista Solutions Pvt Ltd, Bangalore, from [Joining Date] until my wrongful termination on March 28, 2026.
2. On March 28, 2026, I received an email from the HR Department stating that my employment was being terminated on grounds of "conduct not aligned with company values" without specifying any incident, complaint, or opportunity to respond.
3. The termination was arbitrary, discriminatory, and in violation of my fundamental rights under the Constitution of India.
4. I believe the termination was motivated by discriminatory intent based on my gender identity as a transgender person, which is prohibited under law.

## LEGAL GROUNDS:
1. **Navtej Singh Johar v. Union of India (2018) 10 SCC 791** — The Hon'ble Supreme Court decriminalized consensual same-sex relations and affirmed that LGBTQ+ individuals are entitled to full constitutional protection under Articles 14, 15, 19, and 21 of the Constitution.
2. **Article 14** — Right to Equality before law.
3. **Article 15** — Prohibition of discrimination on grounds of religion, race, caste, sex, or place of birth. The Supreme Court has interpreted "sex" to include gender identity and sexual orientation.
4. **Article 21** — Right to Life and Personal Liberty, which includes the right to dignity, privacy, and freedom from discrimination.
5. **NALSA v. Union of India (2014) 5 SCC 438** — The Supreme Court recognized transgender persons as a third gender and affirmed their right to self-identification and non-discrimination.
6. **Industrial Disputes Act, 1947** — Section 2(oo) defines termination, and any termination without valid grounds and proper procedure is illegal.

## RELIEF SOUGHT:
1. Immediate reinstatement to my former position with full back wages and benefits from the date of termination.
2. Compensation of ₹[Amount] for mental agony, humiliation, and loss of reputation caused by the discriminatory termination.
3. A written apology from the company for the discriminatory conduct.
4. Implementation of an inclusive workplace policy with sensitivity training for all employees.

## NOTICE:
You are hereby called upon to respond to this notice within 15 days of receipt, failing which I shall be constrained to initiate appropriate legal proceedings against TechVista Solutions Pvt Ltd, including but not limited to a complaint before the National Human Rights Commission, a petition before the Labour Court, and civil suit for damages, entirely at your own risk as to costs and consequences.

**Signature:**
_______________________
Ananya Roy
Date: April 8, 2026
```

---

## Scene 4: Admin Panel (System Transparency)

**Duration**: 4:45 - 5:15

**Action**: Navigate to `/admin`

**Highlights**:
- Show the **indexed documents count** (knowledge base size)
- Mention the **RAG Pipeline performance** (Top-15 to Top-5 Reranking)
- Show the **System Health** (AWS Bedrock + DynamoDB connectivity)

**Narrator Script**:
> "Behind the scenes, CivicPulse runs on a robust RAG pipeline with 20-turn sliding window memory stored in AWS DynamoDB. This ensures your entire case history is preserved even if you refresh your browser. The system uses vector similarity search to retrieve the most relevant legal provisions, then reranks them for accuracy."

---

## Scene 5: Architecture Flow (How It Works)

**Duration**: 5:15 - 5:45

**Action**: Show the LiveModeFlow diagram from `/architecture`

**Narrator Script**:
> "Our architecture isn't just a wrapper. We use a multimodal pipeline with real-time voice processing through ElevenLabs, OCR through AWS Textract, and AI analysis through OpenAI GPT-4 with fallback to Google Gemini. Every response is grounded in actual Indian law from our indexed knowledge base."

---

## Video Flow Summary

| Scenario | Mode | Knowledge Base Used | Output |
|----------|------|---------------------|--------|
| RTI for job rejection | Live → Draft | Constitution Art.19, Social Security Act | RTI Application PDF |
| Tribal land acquisition | Live → Draft | Wildlife Act, Forest Conservation Act, Constitution | Complaint Letter PDF |
| Employment discrimination | Chat → Draft | Navtej Johar, Naz Foundation, Constitution Art.21 | Legal Notice PDF |

---

## AI Response Guidelines (From Prompt Files)

### Live Mode (live_prompt.txt)
- Response must be exactly 2 sentences or less
- Authoritative, strict, zero-nonsense tone
- Use "Aap" (honorific) — never gendered terms like "Madam/Sir"
- Never say "I am an AI"
- Never use markdown in voice responses

### Chat Mode (system_prompt.txt)
- Warm, empathetic, reassuring tone
- 3-5 sentences by default
- Use simple, everyday words
- For emergencies: action steps first, explanation second
- Provide helpline numbers when relevant: Women Helpline 181, Police 100, Ambulance 108, Child Helpline 1098, Legal Aid 15100

### Draft Generation (draft_phase.txt)
- Gather 6 mandatory details before triggering draft:
  1. Document Type
  2. Parties (sender/recipient)
  3. Full Name
  4. Grievance/Facts
  5. City/Jurisdiction
  6. Date
- Ask only 1-2 missing details per turn
- Never use placeholders like "[to be provided]"
- Trigger `<DRAFT_READY>` tag only when all details are confirmed

---

## Recording Tips

For smooth recording, use these approaches:
- Test voice recognition before recording Live Mode scenarios
- Have documents pre-uploaded for Chat Mode scenario
- Use the Draft Creation flow to show the complete end-to-end journey
- Highlight the risk indicators (Red/Yellow/Green) when showing document analysis

---

**Goal**: Demonstrate how CivicPulse transforms a user's legal problem into a professional, actionable document using AI grounded in real Indian law.