# Referral Component Optimization

## Overview

The referral component has been optimized using TanStack Query to improve performance, reduce loading times, and provide better user experience.

## Key Optimizations

### 1. TanStack Query Implementation

- **Custom Hooks**: Created dedicated hooks for different data fetching operations
- **Query Caching**: Implemented intelligent caching with configurable stale times
- **Background Updates**: Data is automatically refreshed in the background
- **Error Handling**: Better error handling with retry logic

### 2. Performance Improvements

- **Reduced API Calls**: Data is cached and reused across component re-renders
- **Optimistic Updates**: UI updates immediately while data syncs in background
- **Debounced Validation**: Custom code validation uses debouncing to reduce API calls
- **Real-time Updates**: Supabase real-time subscriptions with query invalidation

### 3. User Experience Enhancements

- **Loading States**: Better loading indicators and skeleton screens
- **Error Boundaries**: Improved error handling with retry options
- **Empty States**: Better empty state handling with helpful messages
- **Pagination**: Only shows pagination controls when needed

## Hooks Created

### `useReferralCode()`

- Fetches user's referral code
- Caches for 5 minutes
- Automatic background refresh

### `useReferralDashboard()`

- Fetches referral dashboard data
- Caches for 2 minutes
- Real-time updates via Supabase

### `useGenerateReferralCode()`

- Generates new referral codes
- Optimistic updates
- Automatic cache invalidation

### `useSetCustomReferralCode()`

- Sets custom referral codes
- Validation and availability checking
- Cache management

### `useCurrentUser()`

- Fetches current user data
- Caches for 10 minutes
- Reduced auth API calls

### `useReferralRealtimeUpdates()`

- Sets up real-time subscriptions
- Automatic query invalidation
- Efficient real-time data sync

## Cache Strategy

- **Referral Code**: 5 minutes stale time, 10 minutes garbage collection
- **Dashboard Data**: 2 minutes stale time, 5 minutes garbage collection
- **User Data**: 10 minutes stale time, 30 minutes garbage collection
- **Code Availability**: 30 seconds stale time, 2 minutes garbage collection

## Benefits

1. **Faster Loading**: Cached data loads instantly on subsequent visits
2. **Reduced Server Load**: Fewer API calls due to intelligent caching
3. **Better UX**: Smooth loading states and error handling
4. **Real-time Updates**: Live data without manual refresh
5. **Offline Support**: Cached data available when offline
6. **Developer Experience**: React Query DevTools for debugging

## Usage

The component automatically uses these optimizations. No additional setup required beyond ensuring the QueryProvider is configured in your app.

## Monitoring

Use React Query DevTools (enabled in development) to monitor:

- Query cache status
- Background updates
- Error states
- Performance metrics
