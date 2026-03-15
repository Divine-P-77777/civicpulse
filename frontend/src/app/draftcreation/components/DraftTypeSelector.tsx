import React from 'react';
import { DRAFT_TYPES } from '../constants';

interface DraftTypeSelectorProps {
    selectedType: string;
    onSelect: (type: string) => void;
}

export function DraftTypeSelector({ selectedType, onSelect }: DraftTypeSelectorProps) {
    return (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DRAFT_TYPES.map(type => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                return (
                    <button
                        key={type.id}
                        type="button"
                        onClick={() => onSelect(type.id)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 ${isSelected ? 'border-[#2A6CF0] bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                    >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-[#2A6CF0]' : 'text-slate-400'}`} />
                        <div>
                            <p className={`text-xs font-bold ${isSelected ? 'text-[#2A6CF0]' : 'text-slate-700'}`}>{type.label}</p>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{type.desc}</p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
