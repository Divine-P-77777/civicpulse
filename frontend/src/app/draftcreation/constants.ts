import {
    PenTool, FileText, Gavel, AlertTriangle, Mail, FileSignature
} from 'lucide-react';

export const DRAFT_TYPES = [
    { id: 'complaint', label: 'Complaint', icon: AlertTriangle, color: 'bg-rose-50 border-rose-200 text-rose-600', activeColor: 'bg-rose-500', desc: 'File a formal complaint to authorities' },
    { id: 'legal_notice', label: 'Legal Notice', icon: Gavel, color: 'bg-indigo-50 border-indigo-200 text-indigo-600', activeColor: 'bg-indigo-500', desc: 'Send a legal notice to a party' },
    { id: 'appeal', label: 'Appeal Letter', icon: Mail, color: 'bg-amber-50 border-amber-200 text-amber-600', activeColor: 'bg-amber-500', desc: 'Appeal a decision or order' },
    { id: 'affidavit', label: 'Affidavit', icon: FileSignature, color: 'bg-emerald-50 border-emerald-200 text-emerald-600', activeColor: 'bg-emerald-500', desc: 'Sworn written statement of facts' },
    { id: 'rti', label: 'RTI Application', icon: FileText, color: 'bg-blue-50 border-blue-200 text-blue-600', activeColor: 'bg-blue-500', desc: 'Right to Information request' },
    { id: 'general', label: 'General Draft', icon: PenTool, color: 'bg-slate-50 border-slate-200 text-slate-600', activeColor: 'bg-slate-500', desc: 'General purpose document' },
];

export const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
