# 🎬 CivicPulse Demonstration Guide

This document provides the full script, scenarios, and technical flow for creating a high-impact demonstration video of CivicPulse.

---

## 📽️ Scene 1: Home Page & Vision
**⏱️ Duration**: 0:00 - 0:30
**Action**: Scroll through the homepage smoothly.
**Script**: 
> "Most people feel powerless against big companies or complex legal systems. CivicPulse changes that. We've built an AI-powered legal assistant that understands your rights as clearly as a lawyer, but talks as simply as a friend."

---

## ⚖️ Scene 2: Chat Interface (The Lawyer Scenario)
**⏱️ Duration**: 0:30 - 1:15
**Persona**: Senior Advocate preparing a writ petition.
**Scenario**: Demonstrating "Contextual Intelligence" and Legal Precedents.

### Pre-populated Chat (Use magic command `/demo-lawyer` to inject):
- **User**: "I have a client whose passport was impounded without notice. This seems like a violation of natural justice."
- **AI**: "Indeed. This directly contradicts the principle of 'Audi Alteram Partem' (Hear the other side). The landmark judgment of **Maneka Gandhi vs Union of India (1978)** is the cornerstone for this. It expanded the scope of Article 21, establishing that any procedure depriving a person of personal liberty must be just, fair, and reasonable."

### 🎬 Action (Send this message live during recording):
> **Message to Send**: "Following the Maneka Gandhi precedent, my client's visa delay without a reason could be seen as an arbitrary restriction. How should I frame the **Writ of Mandamus** for this?"
                          
---

## 💻 Scene 3: Live Mode (The "Rohit" ₹78,000 Laptop Story)
**⏱️ Duration**: 1:15 - 2:30
**Persona**: Rohit (frustrated consumer).

**Scenario**: Problem to Legal Solution in under 2 minutes.

### 🎤 Voice/Live Interaction:
- **Rohit**: "Maine ₹78,000 ka laptop kharida, par ye 3 din mein kharab ho gaya. Company replacement nahi de rahi. Kya karu?"

- **AI Response**: "Rohit, don't worry. This is a clear case of 

**Deficiency in Service** under the Consumer Protection Act. Since it's within 3 days, you are entitled to a full replacement or refund. I am drafting a formal **Consumer Legal Notice** for you right now."

### 📄 Draft Generation:
- **Action**: Click the **"Draft Ready"** notification.

- **Show**: The auto-filled Legal Notice in the editor, complete with Rohit's details and the company's address.

---

## 🛠️ Scene 4: Admin Panel (System Transparency)
**⏱️ Duration**: 2:30 - 3:00
**Action**: Navigate to `/admin`.
**Highlights**:
- Show the **indexed documents count** (The knowledge base).
- Mention the **RAG Pipeline performance** (Top-15 to Top-5 Reranking).
- Show the **System Health** (AWS Bedrock + DynamoDB connectivity).

---

## 🏗️ Scene 5: Architecture Flow (The "How it Works")
**⏱️ Duration**: 3:00 - 3:30
**Action**: Show the LiveModeFlow diagram.
**Script**: 
> "Our architecture isn't just a wrapper. We use a multimodal pipeline with **20-turn sliding window memory** stored in AWS DynamoDB. This allows CivicPulse to remember your entire case history even if you refresh your browser, ensuring no context is ever lost."

---

## 🪄 Recording Tips (Magic Commands)
I have added internal shortcuts to the chat interface to help you record:
- **`/demo-lawyer`**: Instantly populates the Maneka Gandhi chat history.
- **`/demo-rohit`**: Instantly populates the laptop grievance history.
- **`/clear`**: Wipes the current chat for a fresh take.

---

**🎯 Goal**: Show how CivicPulse goes from a "Problem" (Rohit's laptop) to a "Solution" (Legal Notice) using high-end AI and deep legal knowledge.
