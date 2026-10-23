import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

import { CapabilityCard } from './CapabilityCard.js';

type Team = { name: string; members: string[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then((response) => {
        if (active) setTeams(response.teams);
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
      <h2>Teams</h2>
      <p>Manage teams and members.</p>
      {error ? (
        <p role="alert">Unable to load teams. Please try again.</p>
      ) : teams === null ? (
        <p role="status">Loading teams…</p>
      ) : teams.length === 0 ? (
        <p>No teams yet.</p>
      ) : (
        <ul>
          {teams.map((team) => (
            <li key={team.name}>
              <h3>{team.name}</h3>
              <p>
                Members: {team.members.length > 0 ? team.members.join(', ') : 'No members'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
