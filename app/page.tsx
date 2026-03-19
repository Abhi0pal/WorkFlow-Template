'use client';

import FileUploader from '@/components/FileUploader';
import { FileCode2, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] text-zinc-900 font-sans">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-600 mb-6">
            <Zap className="w-3 h-3 text-amber-500" />
            Powered by Gemini 3 Flash
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-600">
            Intelligent Document <br /> Workflow
          </h1>
          <p className="text-lg text-zinc-500 max-w-2xl mx-auto mb-12">
            Upload PDF or TXT files to automatically extract structured data and transform it into your predefined JSON templates in seconds.
          </p>
        </motion.div>

        <FileUploader />
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-6 py-24 border-t border-zinc-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <FileCode2 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Smart Extraction</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Advanced AI models analyze your documents to identify titles, authors, summaries, and key entities without manual tagging.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Instant Transformation</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Automatically map extracted data into your specific business JSON schema for immediate downstream processing.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Secure & Reliable</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Built-in validation for file types, sizes, and content integrity ensures your workflow remains robust and secure.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-200 text-center text-xs text-zinc-400 uppercase tracking-widest">
        DocFlow AI &copy; 2026 &bull; Professional Document Processing
      </footer>
    </main>
  );
}
