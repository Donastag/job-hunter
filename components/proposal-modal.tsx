'use client'

import { useState, useEffect } from 'react'
import { Job } from '@/types'

interface ProposalModalProps {
  isOpen: boolean
  onClose: () => void
  job: Job | null
}

interface Template {
  id: string
  name: string
  category: string
  content: string
  variables: string[]
  wins: number
  sent: number
  rate: string
}

export default function ProposalModal({ isOpen, onClose, job }: ProposalModalProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [generatedProposal, setGeneratedProposal] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
        // Select best performing template by default
        if (data.length > 0) {
          const bestTemplate = data.reduce((prev: Template, current: Template) => 
            parseFloat(prev.rate) > parseFloat(current.rate) ? prev : current
          )
          setSelectedTemplate(bestTemplate)
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const generateProposal = async () => {
    if (!selectedTemplate || !job) return

    setIsGenerating(true)
    
    try {
      // Create a mock proposal based on template and job data
      const proposal = selectedTemplate.content
        .replace(/\{\{job_title\}\}/g, job.title)
        .replace(/\{\{pain_point\}\}/g, job.brief || 'your specific requirements')
        .replace(/\{\{detected_stack\}\}/g, job.tags.join(', '))
        .replace(/\{\{industry\}\}/g, 'your industry')
        .replace(/\{\{demo_link\}\}/g, 'https://your-portfolio.com/demo')

      setGeneratedProposal(proposal)
    } catch (error) {
      console.error('Error generating proposal:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const submitProposal = async () => {
    if (!generatedProposal || !job) return

    setIsSubmitting(true)
    
    try {
      // Send proposal to Telegram for review
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          proposal: generatedProposal,
          templateUsed: selectedTemplate?.name,
          budget: job.budget
        })
      })

          // Send notification to Telegram
      await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `NewProposal Generated for ${job.title} - ${job.budget}\n\n${generatedProposal.substring(0, 200)}...`
        })
      })

      alert('Proposal sent to Telegram for review!')
      onClose()
    } catch (error) {
      console.error('Error submitting proposal:', error)
      alert('Error submitting proposal. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !job) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Proposal for {job.title}
            </h2>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                Score: {job.score}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                {job.budget}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Template Selection */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Template
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-900">{template.name}</span>
                      <span className="text-xs text-green-600 font-medium">{template.rate} win rate</span>
                    </div>
                    <div className="text-xs text-gray-600">{template.category}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {template.wins} wins / {template.sent} sent
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Proposal */}
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Generated Proposal
                </label>
                <button
                  onClick={generateProposal}
                  disabled={isGenerating || !selectedTemplate}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-64">
                {generatedProposal ? (
                  <div className="prose prose-sm max-w-none">
                    {generatedProposal.split('\n').map((line, index) => (
                      <p key={index} className="mb-2 text-gray-800">{line}</p>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    Select a template and click "Generate" to create a proposal
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitProposal}
              disabled={!generatedProposal || isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Sending...' : 'Send to Telegram'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}