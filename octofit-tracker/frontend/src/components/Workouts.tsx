import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const userEmail = encodeURIComponent('mona@example.com');
    getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${userEmail}`)
      .then((response) => {
        if (active) setSuggestions(response.suggestions);
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
      <h2>Workout suggestions</h2>
      <p>Recommend workouts from activity patterns.</p>
      {error ? (
        <p role="alert">Unable to load workout suggestions. Please try again.</p>
      ) : suggestions === null ? (
        <p role="status">Loading workout suggestions…</p>
      ) : suggestions.length === 0 ? (
        <p>No workout suggestions available.</p>
      ) : (
        <ul>
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.title}-${index}`}>
              <h3>{suggestion.title}</h3>
              {suggestion.focus && <p>Focus: {suggestion.focus}</p>}
              {suggestion.minutes !== undefined && <p>Duration: {suggestion.minutes} minutes</p>}
              {suggestion.difficulty && <p>Difficulty: {suggestion.difficulty}</p>}
              <p>{suggestion.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
