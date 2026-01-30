/**
 * Common type definitions for CivicPulse frontend
 */

export interface User {
  id: string;
  email: string;
  full_name?: string;
  preferred_language: string;
  created_at: string;
}

export interface Document {
  id: string;
  filename: string;
  upload_date: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  risk_assessment?: RiskAssessment;
  extracted_text?: string;
}

export interface RiskAssessment {
  overall_risk: 'low' | 'medium' | 'high';
  risky_clauses_count: number;
  clauses: AnalyzedClause[];
}

export interface AnalyzedClause {
  text: string;
  risk_level: 'low' | 'medium' | 'high';
  category: string;
  explanation: string;
  recommendations: string[];
  legal_references: LegalReference[];
}

export interface LegalReference {
  act: string;
  section: string;
  description: string;
  relevance: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  risk_assessment?: RiskAssessment;
  legal_references?: LegalReference[];
}

export interface Conversation {
  id: string;
  mode: 'live' | 'chat';
  started_at: string;
  document_context?: string;
  messages: ChatMessage[];
}

export type RiskLevel = 'low' | 'medium' | 'high';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error';
export type ConversationMode = 'live' | 'chat';