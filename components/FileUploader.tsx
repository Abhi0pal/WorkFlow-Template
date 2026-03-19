'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, ChevronRight, Download, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractStructuredData, transformToTemplate } from '@/lib/gemini';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

interface ProcessResult {
  raw: any;
  template: any;
}

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['application/pdf', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload PDF or TXT.');
      return;
    }
    setError(null);
    setFile(file);
    setResult(null);
    setStatus('idle');
  };

  const handleProcess = async () => {
    if (!file) return;

    setStatus('processing');

    try {
      let rawJson: any;

      if (file.type === 'application/pdf') {
        // Read PDF as base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        rawJson = await extractStructuredData({
          data: base64,
          mimeType: 'application/pdf'
        });
      } else {
        // Read text file
        const text = await file.text();
        if (!text.trim()) {
          throw new Error('The text file is empty.');
        }
        rawJson = await extractStructuredData(text);
      }

      const templateJson = transformToTemplate(rawJson);

      setResult({
        raw: rawJson,
        template: templateJson
      });
      setStatus('success');
    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.message || 'An error occurred during processing.');
      setStatus('error');
    }
  };

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMarkdown = (data: any, filename: string) => {
    const { srs_metadata, introduction, functional_spec, non_functional_spec, system_workflow } = data;
    
    let md = `# ${srs_metadata.title}\n\n`;
    md += `**Version:** ${srs_metadata.version}\n`;
    md += `**Status:** ${srs_metadata.status}\n`;
    md += `**Generated At:** ${new Date(srs_metadata.generated_at).toLocaleString()}\n\n`;
    
    md += `## 1. Introduction\n\n`;
    md += `### 1.1 Purpose\n${introduction.purpose}\n\n`;
    md += `### 1.2 Scope\n${introduction.scope}\n\n`;
    
    md += `## 2. Functional Requirements\n\n`;
    functional_spec.requirements.forEach((req: any) => {
      md += `- **${req.id || 'REQ'}**: ${req.description} (Priority: ${req.priority})\n`;
    });
    md += `\n`;
    
    if (functional_spec.user_stories.length > 0) {
      md += `### 2.1 User Stories\n\n`;
      functional_spec.user_stories.forEach((story: string) => {
        md += `- ${story}\n`;
      });
      md += `\n`;
    }
    
    md += `## 3. Non-Functional Requirements\n\n`;
    non_functional_spec.requirements.forEach((req: any) => {
      md += `- **${req.category}**: ${req.description}\n`;
    });
    md += `\n`;
    
    md += `## 4. System Workflow\n\n`;
    md += `| Step | Actor | Action | Expected Result | Details |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    system_workflow.steps.forEach((step: any, idx: number) => {
      md += `| ${step.step_number || idx + 1} | ${step.actor} | ${step.action} | ${step.expected_result} | ${step.details || 'N/A'} |\n`;
    });
    md += `\n`;

    if (data.action_matrix && data.action_matrix.length > 0) {
      md += `## 5. Action Matrix\n\n`;
      md += `| User | Role Type | Action Allowed | Startpoint | Endpoint | SLA | Form Type ID | Jurisdiction | Conditions |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
      data.action_matrix.forEach((row: any) => {
        md += `| ${row.user || ''} | ${row.role_type || ''} | ${row.action_allowed || ''} | ${row.startpoint || ''} | ${row.endpoint || ''} | ${row.sla || ''} | ${row.form_type_id || ''} | ${row.jurisdiction || ''} | ${row.conditions || ''} |\n`;
      });
      md += `\n`;
    }
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadWord = async (data: any, filename: string) => {
    const { srs_metadata, introduction, functional_spec, non_functional_spec, system_workflow, action_matrix } = data;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: srs_metadata.title,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Version: ${srs_metadata.version}`, bold: true }),
              new TextRun({ text: `\tStatus: ${srs_metadata.status}`, bold: true }),
            ],
          }),
          new Paragraph({
            text: `Generated At: ${new Date(srs_metadata.generated_at).toLocaleString()}`,
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),

          new Paragraph({ text: "1. Introduction", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "1.1 Purpose", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: introduction.purpose }),
          new Paragraph({ text: "1.2 Scope", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: introduction.scope }),

          new Paragraph({ text: "2. Functional Requirements", heading: HeadingLevel.HEADING_1 }),
          ...functional_spec.requirements.flatMap((req: any) => [
            new Paragraph({
              children: [
                new TextRun({ text: `${req.id || 'REQ'}: `, bold: true }),
                new TextRun({ text: req.description }),
                new TextRun({ text: ` (Priority: ${req.priority})`, italics: true }),
              ],
              bullet: { level: 0 }
            })
          ]),

          ...(functional_spec.user_stories.length > 0 ? [
            new Paragraph({ text: "2.1 User Stories", heading: HeadingLevel.HEADING_2 }),
            ...functional_spec.user_stories.map((story: string) => 
              new Paragraph({ text: story, bullet: { level: 0 } })
            )
          ] : []),

          new Paragraph({ text: "3. Non-Functional Requirements", heading: HeadingLevel.HEADING_1 }),
          ...non_functional_spec.requirements.map((req: any) => 
            new Paragraph({
              children: [
                new TextRun({ text: `${req.category}: `, bold: true }),
                new TextRun({ text: req.description }),
              ],
              bullet: { level: 0 }
            })
          ),

          new Paragraph({ text: "4. System Workflow", heading: HeadingLevel.HEADING_1 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Step", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Actor", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Action", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Expected Result", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Details", bold: true })] })] }),
                ],
              }),
              ...system_workflow.steps.map((step: any, idx: number) => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: (step.step_number || idx + 1).toString() })] }),
                    new TableCell({ children: [new Paragraph({ text: step.actor })] }),
                    new TableCell({ children: [new Paragraph({ text: step.action })] }),
                    new TableCell({ children: [new Paragraph({ text: step.expected_result })] }),
                    new TableCell({ children: [new Paragraph({ text: step.details || 'N/A' })] }),
                  ],
                })
              ),
            ],
          }),

          ...(action_matrix && action_matrix.length > 0 ? [
            new Paragraph({ text: "5. Action Matrix", heading: HeadingLevel.HEADING_1 }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "User", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Role Type", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Action Allowed", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Startpoint", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Endpoint", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SLA", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Form Type ID", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jurisdiction", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Conditions", bold: true })] })] }),
                  ],
                }),
                ...action_matrix.map((row: any) => 
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ text: row.user || '' })] }),
                      new TableCell({ children: [new Paragraph({ text: row.role_type || '' })] }),
                      new TableCell({ children: [new Paragraph({ text: row.action_allowed || '' })] }),
                      new TableCell({ children: [new Paragraph({ text: row.startpoint || '' })] }),
                      new TableCell({ children: [new Paragraph({ text: row.endpoint || '' })] }),
                      new TableCell({ children: [new Paragraph({ text: row.sla || '' })] }),
                      new TableCell({ children: [new Paragraph({ text: row.form_type_id || '' })] }),
                      new TableCell({ children: [new Paragraph({ text: row.jurisdiction || '' })] }),
                      new TableCell({ children: [new Paragraph({ text: row.conditions || '' })] }),
                    ],
                  })
                ),
              ],
            }),
          ] : []),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer
          flex flex-col items-center justify-center text-center space-y-4
          ${isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-zinc-200 hover:border-zinc-300 bg-white'}
          ${status === 'processing' ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
          className="hidden"
          accept=".pdf,.txt"
        />
        
        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
          <Upload className={`w-8 h-8 ${isDragging ? 'text-emerald-500' : 'text-zinc-400'}`} />
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-zinc-900">
            {file ? file.name : 'Click or drag to upload'}
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            Support PDF and TXT files up to 10MB
          </p>
        </div>

        {file && status === 'idle' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleProcess();
            }}
            className="mt-4 px-6 py-2 bg-zinc-900 text-white rounded-full font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
          >
            Start Processing
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status Messages */}
      <AnimatePresence mode="wait">
        {status === 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center gap-3 text-zinc-600"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Extracting text and generating JSON...</span>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              SRS Generation Complete
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => downloadJson(result.raw, 'srs_raw_data.json')}
                className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Raw JSON
              </button>
              <button 
                onClick={() => downloadMarkdown(result.template, 'srs_document.md')}
                className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Markdown (.md)
              </button>
              <button 
                onClick={() => downloadWord(result.template, 'srs_document.docx')}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Word (.docx)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Metadata & Introduction */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">Metadata</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 block">Project Name</label>
                    <p className="font-medium text-zinc-900">{result.template.srs_metadata.title}</p>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block">Status</label>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                      {result.template.srs_metadata.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block">Generated At</label>
                    <p className="text-sm text-zinc-600">
                      {new Date(result.template.srs_metadata.generated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">Introduction</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-900 mb-1">Purpose</h4>
                    <p className="text-sm text-zinc-600 leading-relaxed">{result.template.introduction.purpose}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-900 mb-1">Scope</h4>
                    <p className="text-sm text-zinc-600 leading-relaxed">{result.template.introduction.scope}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Requirements & Workflow */}
            <div className="lg:col-span-2 space-y-6">
              {/* Workflow Table */}
              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">System Workflow</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-100">
                      <tr>
                        <th className="px-4 py-3 w-16">Step</th>
                        <th className="px-4 py-3">Actor</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Expected Result</th>
                        <th className="px-4 py-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {result.template.system_workflow.steps.map((step: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-zinc-400">{step.step_number || idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-zinc-900">{step.actor}</td>
                          <td className="px-4 py-3 text-zinc-600">{step.action}</td>
                          <td className="px-4 py-3 text-zinc-600">{step.expected_result}</td>
                          <td className="px-4 py-3 text-zinc-600">{step.details || 'N/A'}</td>
                        </tr>
                      ))}
                      {result.template.system_workflow.steps.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 italic">
                            No workflow steps identified.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Matrix Table */}
              {result.template.action_matrix && result.template.action_matrix.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Action Matrix (Process Flow)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-100">
                        <tr>
                          <th className="px-2 py-2">User</th>
                          <th className="px-2 py-2">Role Type</th>
                          <th className="px-2 py-2">Action Allowed</th>
                          <th className="px-2 py-2">Startpoint</th>
                          <th className="px-2 py-2">Endpoint</th>
                          <th className="px-2 py-2">SLA</th>
                          <th className="px-2 py-2">Form Type ID</th>
                          <th className="px-2 py-2">Jurisdiction</th>
                          <th className="px-2 py-2">Conditions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {result.template.action_matrix.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-2 py-2 font-medium text-zinc-900">{row.user}</td>
                            <td className="px-2 py-2 text-zinc-600">{row.role_type}</td>
                            <td className="px-2 py-2 text-zinc-600">{row.action_allowed}</td>
                            <td className="px-2 py-2 text-zinc-600">{row.startpoint}</td>
                            <td className="px-2 py-2 text-zinc-600">{row.endpoint}</td>
                            <td className="px-2 py-2 text-zinc-600">{row.sla}</td>
                            <td className="px-2 py-2 text-zinc-600">{row.form_type_id}</td>
                            <td className="px-2 py-2 text-zinc-600">{row.jurisdiction}</td>
                            <td className="px-2 py-2 text-zinc-600">{row.conditions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Functional Requirements */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">Functional Requirements</h3>
                <div className="space-y-3">
                  {result.template.functional_spec.requirements.map((req: any, idx: number) => (
                    <div key={idx} className="flex gap-4 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                      <span className="text-xs font-bold text-zinc-400 mt-1">{req.id || `FR-${idx + 1}`}</span>
                      <div className="flex-1">
                        <p className="text-sm text-zinc-700">{req.description}</p>
                        <span className={`
                          mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                          ${req.priority === 'High' ? 'bg-red-100 text-red-700' : 
                            req.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 
                            'bg-blue-100 text-blue-700'}
                        `}>
                          {req.priority} Priority
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Stories */}
              {result.template.functional_spec.user_stories.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">User Stories</h3>
                  <ul className="space-y-2">
                    {result.template.functional_spec.user_stories.map((story: string, idx: number) => (
                      <li key={idx} className="text-sm text-zinc-600 flex gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        {story}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
