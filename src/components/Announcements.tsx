import type { Announcement } from '../types'

/**
 * Check if an announcement is currently live (active and not expired)
 */
export function isAnnouncementLive(ann: Announcement): boolean {
  if (!ann.isActive) return false
  if (ann.expiresAt && ann.expiresAt < Date.now()) return false
  return true
}

/**
 * Get category badge color and icon
 */
function getCategoryStyle(category: string): { icon: string; bgColor: string; textColor: string } {
  const styles: Record<string, { icon: string; bgColor: string; textColor: string }> = {
    Academic: { icon: '📚', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    Event: { icon: '🎉', bgColor: 'bg-green-100', textColor: 'text-green-700' },
    Exam: { icon: '📝', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
    Holiday: { icon: '🏖️', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
    Urgent: { icon: '🚨', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  }
  return styles[category] || { icon: '📌', bgColor: 'bg-gray-100', textColor: 'text-gray-700' }
}

interface AnnouncementListProps {
  items: Announcement[]
}

export function AnnouncementList({ items }: AnnouncementListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No announcements at the moment</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((ann) => {
        const style = getCategoryStyle(ann.category ?? '')
        const isExpired = ann.expiresAt && ann.expiresAt < Date.now()

        return (
          <div
            key={ann.id}
            className={`p-3 border rounded-lg transition ${
              isExpired
                ? 'opacity-50 bg-gray-50 border-gray-200'
                : ann.isUrgent
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <span className="text-xl">{style.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm truncate">{ann.title}</h4>
                  {ann.isUrgent && <span className="text-xs font-bold text-red-600">URGENT</span>}
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  {ann.authorName} • {formatDate(ann.createdAt)}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  {ann.message}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${style.bgColor} ${style.textColor}`}
                  >
                    {ann.category}
                  </span>
                  {ann.expiresAt && (
                    <span className="text-xs text-gray-500">
                      {isExpired ? 'Expired' : `Expires ${formatDate(ann.expiresAt)}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Format timestamp to readable date/time
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
