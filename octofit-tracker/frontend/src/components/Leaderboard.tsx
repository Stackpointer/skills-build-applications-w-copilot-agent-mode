import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = { rank: number; teamName: string; totalPoints: number };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then((response) => {
        if (active) setLeaderboard(response.leaderboard);
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
      <h2>Leaderboard</h2>
      <p>Compare team point totals.</p>
      {error ? (
        <p role="alert">Unable to load the leaderboard. Please try again.</p>
      ) : leaderboard === null ? (
        <p role="status">Loading leaderboard…</p>
      ) : leaderboard.length === 0 ? (
        <p>No leaderboard scores yet.</p>
      ) : (
        <table className="table">
          <caption>Team rankings by total points</caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Team</th>
              <th scope="col">Total points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr key={`${entry.rank}-${entry.teamName}`}>
                <td>{entry.rank}</td>
                <td>{entry.teamName}</td>
                <td>{entry.totalPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
