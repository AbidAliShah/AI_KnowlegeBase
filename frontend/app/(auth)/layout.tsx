'use client';

import React from 'react';
import { BrainCircuit } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-offwhite-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <BrainCircuit className="h-8 w-8 text-mustard-500" />
          <span className="text-2xl font-bold text-charcoal-700">KnowledgeAI</span>
        </div>
        {children}
      </div>
    </div>
  );
}
