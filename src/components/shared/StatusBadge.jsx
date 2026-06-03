import React from 'react'

const config = {
  new:       { label: 'New',       cls: 'badge-blue' },
  review:    { label: 'In Review', cls: 'badge-yellow' },
  interview: { label: 'Interview', cls: 'badge-green' },
  offer:     { label: 'Offer',     cls: 'bg-purple-100 text-purple-800 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium' },
  rejected:  { label: 'Rejected',  cls: 'badge-red' },
  active:    { label: 'Active',    cls: 'badge-green' },
  paused:    { label: 'Paused',    cls: 'badge-yellow' },
  closed:    { label: 'Closed',    cls: 'badge-red' },
  scheduled: { label: 'Scheduled', cls: 'badge-blue' },
  completed: { label: 'Completed', cls: 'badge-green' },
  cancelled: { label: 'Cancelled', cls: 'badge-red' },
}

export default function StatusBadge({ status }) {
  const { label, cls } = config[status] || { label: status, cls: 'badge-blue' }
  return <span className={cls}>{label}</span>
}
