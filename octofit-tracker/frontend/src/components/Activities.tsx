import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

import { CapabilityCard } from './CapabilityCard.js';

type Activity = { type: string; minutes: number; points: number };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ activities: Activity[] }>('/api/activities')
      .then((response) => {
        if (active) setActivities(response.activities);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <h2>Activities</h2>
      <p>Track student activity minutes and points.</p>
      {error ? (
        <p role="alert">Unable to load activities. Please try again.</p>
      ) : activities === null ? (
        <p role="status">Loading activities…</p>
      ) : activities.length === 0 ? (
        <p>No activities yet.</p>
      ) : (
        <ul>
          {activities.map((activity, index) => (
            <li key={`${activity.type}-${index}`}>
              {activity.type}: {activity.minutes} minutes, {activity.points} points
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
