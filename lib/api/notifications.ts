/**
 * Notifications API functions.
 * Endpoints for managing user notifications.
 */

import { apiClient } from './client'
import type {
  Notification,
  NotificationFilters,
  NotificationPreferences,
  PaginatedResponse,
} from '@/lib/company/types'

// =============================================================================
// Notification Queries
// =============================================================================

/**
 * Get paginated list of notifications.
 */
export async function getNotifications(
  filters?: NotificationFilters
): Promise<PaginatedResponse<Notification>> {
  const params = new URLSearchParams()

  if (filters?.read !== undefined) params.set('read', String(filters.read))
  if (filters?.type) params.set('type', filters.type)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/notifications/?${query}` : '/api/notifications/'

  return apiClient<PaginatedResponse<Notification>>(endpoint)
}

/**
 * Get a single notification.
 */
export async function getNotification(id: number): Promise<Notification> {
  return apiClient<Notification>(`/api/notifications/${id}/`)
}

// =============================================================================
// Notification Actions
// =============================================================================

/**
 * Mark a notification as read.
 */
export async function markAsRead(id: number): Promise<Notification> {
  return apiClient<Notification>(`/api/notifications/${id}/read/`, {
    method: 'POST',
  })
}

/**
 * Mark all notifications as read.
 */
export async function markAllAsRead(): Promise<{ marked_count: number }> {
  return apiClient<{ marked_count: number }>('/api/notifications/read-all/', {
    method: 'POST',
  })
}

/**
 * Delete a notification.
 */
export async function deleteNotification(id: number): Promise<void> {
  await apiClient(`/api/notifications/${id}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Notification Count
// =============================================================================

/**
 * Get count of unread notifications.
 */
export async function getUnreadCount(): Promise<number> {
  const response = await apiClient<{ count: number }>('/api/notifications/unread-count/')
  return response.count
}

// =============================================================================
// Notification Preferences
// =============================================================================

/**
 * Get notification preferences.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiClient<NotificationPreferences>('/api/notifications/preferences/')
}

/**
 * Update notification preferences.
 */
export async function updateNotificationPreferences(
  data: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return apiClient<NotificationPreferences>('/api/notifications/preferences/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
