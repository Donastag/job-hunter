import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Clock, 
  Target,
  BarChart3,
  LineChart,
  PieChart,
  Calendar,
  Filter
} from 'lucide-react'

interface AnalyticsData {
  totalJobs: number
  appliedJobs: number
  interviewJobs: number
  offerJobs: number
  rejectedJobs: number
  winRate: number
  avgResponseTime: number
  avgBudget: number
  topSkills: Array<{ skill: string; count: number }>
  platformDistribution: Array<{ platform: string; count: number }>
  monthlyApplications: Array<{ month: string; count: number }>
  budgetDistribution: Array<{ range: string; count: number }>
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`)
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <div className="flex gap-4">
            {['7d', '30d', '90d', '1y'].map(range => (
              <button
                key={range}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-400">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-24 bg-gray-800 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No analytics data available</p>
      </div>
    )
  }

  const metrics = [
    {
      title: 'Total Applications',
      value: analytics.totalJobs,
      change: '+12%',
      icon: Users,
      color: 'text-blue-400'
    },
    {
      title: 'Win Rate',
      value: `${analytics.winRate}%`,
      change: '+3.2%',
      icon: Target,
      color: 'text-green-400'
    },
    {
      title: 'Avg Response Time',
      value: `${analytics.avgResponseTime}h`,
      change: '-1.5h',
      icon: Clock,
      color: 'text-yellow-400'
    },
    {
      title: 'Avg Budget',
      value: `$${analytics.avgBudget.toLocaleString()}`,
      change: '+$500',
      icon: DollarSign,
      color: 'text-purple-400'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Track your job application performance and insights</p>
        </div>
        <div className="flex gap-4">
          {['7d', '30d', '90d', '1y'].map(range => (
            <button
              key={range}
              className={`px-4 py-2 rounded-lg transition-colors ${
                timeRange === range 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">{metric.title}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{metric.value}</div>
              <p className="text-xs text-gray-500 mt-1">vs last period {metric.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Funnel */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Application Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { stage: 'Applied', count: analytics.appliedJobs, color: 'bg-blue-500' },
                { stage: 'Interview', count: analytics.interviewJobs, color: 'bg-yellow-500' },
                { stage: 'Offer', count: analytics.offerJobs, color: 'bg-green-500' },
                { stage: 'Rejected', count: analytics.rejectedJobs, color: 'bg-red-500' }
              ].map((stage, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                    <span className="text-gray-300">{stage.stage}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{stage.count}</span>
                    <Progress 
                      value={(stage.count / analytics.totalJobs) * 100} 
                      className="w-24"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Distribution */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <PieChart className="h-5 w-5 text-purple-400" />
              Platform Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.platformDistribution.map((platform, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    <span className="text-gray-300 capitalize">{platform.platform}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{platform.count}</span>
                    <Progress 
                      value={(platform.count / analytics.totalJobs) * 100} 
                      className="w-24"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skills and Budget Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <LineChart className="h-5 w-5 text-green-400" />
              Top Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topSkills.slice(0, 8).map((skill, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-300">{skill.skill}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{skill.count}</span>
                    <Progress 
                      value={(skill.count / Math.max(...analytics.topSkills.map(s => s.count))) * 100} 
                      className="w-32"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Budget Distribution */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5 text-yellow-400" />
              Budget Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.budgetDistribution.map((range, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-300">{range.range}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{range.count}</span>
                    <Progress 
                      value={(range.count / analytics.totalJobs) * 100} 
                      className="w-32"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Applications */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-blue-400" />
            Monthly Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2">
            {analytics.monthlyApplications.map((month, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div 
                  className="w-8 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-400"
                  style={{ height: `${Math.max(20, (month.count / Math.max(...analytics.monthlyApplications.map(m => m.count))) * 120)}px` }}
                ></div>
                <span className="text-xs text-gray-400 text-center">{month.month}</span>
                <span className="text-xs text-white font-medium">{month.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-green-500/20 to-transparent p-4 rounded-lg border border-green-500/30">
              <h3 className="text-green-400 font-semibold mb-2">Strengths</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• High response rate from premium clients</li>
                <li>• Strong performance in React/Node.js roles</li>
                <li>• Consistent application quality</li>
              </ul>
            </div>
            <div className="bg-gradient-to-r from-yellow-500/20 to-transparent p-4 rounded-lg border border-yellow-500/30">
              <h3 className="text-yellow-400 font-semibold mb-2">Areas for Improvement</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Increase interview conversion rate</li>
                <li>• Focus on higher-budget opportunities</li>
                <li>• Expand to more platforms</li>
              </ul>
            </div>
            <div className="bg-gradient-to-r from-blue-500/20 to-transparent p-4 rounded-lg border border-blue-500/30">
              <h3 className="text-blue-400 font-semibold mb-2">Recommendations</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Optimize proposal templates</li>
                <li>• Target enterprise clients</li>
                <li>• Leverage AI scoring insights</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}